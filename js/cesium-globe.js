/**
 * SkyLens CesiumJS 3D Weather Globe
 * Uses only UrlTemplateImageryProvider with CORS-safe free tile sources.
 *
 * NOTE: server.arcgisonline.com / services.arcgisonline.com currently answer
 * HTTP 403 (even their ?f=json metadata endpoint) from many networks, and
 * their error responses carry no CORS headers — so browsers surface this as
 * a CORS failure on top of the 403. Satellite tiles therefore come from the
 * Esri Wayback host (wayback.maptiles.arcgis.com), which serves the same
 * World_Imagery and sends `Access-Control-Allow-Origin: *`.
 */

var CesiumGlobe = (function () {
  'use strict';

  var viewer = null;
  var initialized = false;
  var currentMarker = null;
  var activeBaseLayer = 'satellite';
  var activeWeatherLayers = {};
  var initInProgress = false;

  // Auto-fallback when a base layer's tiles keep failing (e.g. provider 403s)
  var baseLayerErrorCount = 0;
  var baseLayerFallbackDone = false;
  var baseLayerFailureHandler = null;
  var BASE_LAYER_ERROR_THRESHOLD = 10;

  // Base imagery tile sources - UrlTemplateImageryProvider for free tiles,
  // IonImageryProvider (via Cesium Ion token) for Cesium World Imagery.
  // Order = panel order in #baseLayerOptions. Satellite first = default.
  var BASE_LAYERS = {
    satellite: {
      name: 'Satellite',
      icon: 'satellite',
      // Esri World Imagery via the Wayback host: same imagery as
      // server.arcgisonline.com (which currently 403s), but reachable and
      // CORS-safe (`Access-Control-Allow-Origin: *`), no API key needed.
      // Unversioned tile path 301-redirects to the latest release; XHR
      // follows it transparently.
      url: 'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      credit: '\u00A9 Esri',
      subdomains: []
    },
    'cesium-ion': {
      name: 'Cesium Ion',
      icon: 'public',
      isIon: true,
      credit: '\u00A9 Cesium ion'
    },
    'cartodb-dark': {
      name: 'Dark',
      icon: 'dark_mode',
      // NOTE: {r} removed — that's Leaflet-only (@2x retina). Cesium's
      // UrlTemplateImageryProvider leaves {r} literal, producing bad URLs
      // like .../10{r}.png which CARTO rejects. No API key needed.
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      credit: '\u00A9 CARTO',
      subdomains: ['a', 'b', 'c', 'd']
    },
    standard: {
      name: 'Streets',
      icon: 'map',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      credit: '\u00A9 OpenStreetMap contributors',
      subdomains: ['a', 'b', 'c']
    }
  };

  // Weather tile layers — same-origin proxy, OWM key stays server-side.
  // Cesium substitutes {z}/{x}/{y} before requesting /api/tiles.
  var WEATHER_LAYERS = {
    clouds: {
      name: 'Clouds',
      icon: 'cloud',
      url: '/api/tiles?layer=clouds_new&z={z}&x={x}&y={y}',
      opacity: 0.5
    },
    precipitation: {
      name: 'Precipitation',
      icon: 'rainy',
      url: '/api/tiles?layer=precipitation_new&z={z}&x={x}&y={y}',
      opacity: 0.6
    },
    temperature: {
      name: 'Temperature',
      icon: 'thermostat',
      url: '/api/tiles?layer=temp_new&z={z}&x={x}&y={y}',
      opacity: 0.5
    },
    wind: {
      name: 'Wind',
      icon: 'air',
      url: '/api/tiles?layer=wind_new&z={z}&x={x}&y={y}',
      opacity: 0.5
    },
    pressure: {
      name: 'Pressure',
      icon: 'compress',
      url: '/api/tiles?layer=pressure_new&z={z}&x={x}&y={y}',
      opacity: 0.4
    }
  };

  // Ion token: loaded once from /api/config (env, not git).
  // Satellite (default) needs no token, so globe works even without it.
  var ionTokenPromise = null;
  function ensureIonToken() {
    if (Cesium.Ion.defaultAccessToken) return Promise.resolve(Cesium.Ion.defaultAccessToken);
    if (!ionTokenPromise) {
      ionTokenPromise = fetch('/api/config').then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.cesiumToken) {
          try { Cesium.Ion.defaultAccessToken = j.cesiumToken; } catch (e) {}
          return j.cesiumToken;
        }
        return '';
      }).catch(function () { return ''; });
    }
    return ionTokenPromise;
  }

  /**
   * Create a tile imagery provider from a layer config
   */
  function createImageryProvider(config) {
    var options = {
      url: config.url,
      credit: config.credit || '',
      maximumLevel: config.maximumLevel || 19,
      tilingScheme: new Cesium.WebMercatorTilingScheme()
    };

    if (config.subdomains && config.subdomains.length > 0) {
      options.subdomains = config.subdomains;
    }

    return new Cesium.UrlTemplateImageryProvider(options);
  }

  /**
   * Initialize the Cesium viewer
   */
  function init(containerId) {
    if (initialized && viewer) return true;
    if (initInProgress) return false;
    initInProgress = true;

    try {
      // Pre-flight checks
      if (typeof Cesium === 'undefined') {
        console.error('CesiumGlobe: Cesium not loaded');
        initInProgress = false;
        return false;
      }

      var container = document.getElementById(containerId);
      if (!container) {
        console.error('CesiumGlobe: Container #' + containerId + ' not found');
        initInProgress = false;
        return false;
      }

      var rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.error('CesiumGlobe: Container has zero dimensions');
        initInProgress = false;
        return false;
      }

      // Ensure container dimensions
      container.style.width = '100%';
      container.style.position = 'relative';
      container.style.overflow = 'hidden';

      // Pre-fetch Ion token (env, not git) so the Ion layer is ready if selected.
      // Satellite default needs no token — globe works even when unset.
      try { ensureIonToken(); } catch (e) {}

      // Create viewer with default imagery first, then replace it
      // This ensures the viewer always has something to show
      viewer = new Cesium.Viewer(containerId, {
        animation: false,
        timeline: false,
        baseLayer: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        vrButton: false,
        selectionIndicator: false,
        infoBox: false,
        requestRenderMode: false,
        shadows: false
      });

      // No default imagery to remove (baseLayer: false prevents Bing/OSM loading)

      // Configure scene
      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.showGroundAtmosphere = true;
      viewer.scene.globe.maximumScreenSpaceError = 2;
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0b0c3d');
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0b0c3d');

      // Remove credit display
      if (viewer.creditDisplay && viewer.creditDisplay.container) {
        viewer.creditDisplay.container.style.display = 'none';
      }

      // Camera controls
      viewer.scene.screenSpaceCameraController.enableSmoothZoom = true;
      viewer.scene.screenSpaceCameraController.smoothZoomDeceleration = 0.5;
      viewer.scene.screenSpaceCameraController.enableTilt = true;
      viewer.scene.screenSpaceCameraController.enableRotate = true;

      // Default to Esri Wayback satellite (free, CORS-safe, no key).
      // Falls back to OSM standard if tiles fail. Cesium Ion stays
      // selectable in the layer panel and uses the Ion token.
      addBaseLayer('satellite');

      // Force render
      viewer.resize();
      viewer.scene.requestRender();

      // Verify canvas
      var canvas = container.querySelector('canvas');
      if (!canvas) {
        console.error('CesiumGlobe: No canvas found after init');
        initInProgress = false;
        initialized = false;
        viewer = null;
        return false;
      }

      console.log('CesiumGlobe: Init successful, canvas:', canvas.width + 'x' + canvas.height);
      initialized = true;
      initInProgress = false;
      return true;
    } catch (err) {
      console.error('CesiumGlobe: Init failed:', err.message, err.stack);
      if (viewer) {
        try { viewer.destroy(); } catch (e) {}
      }
      viewer = null;
      initialized = false;
      initInProgress = false;
      return false;
    }
  }

  /**
   * Add a base imagery layer
   */
  function removeNonWeatherLayers() {
    var layersToRemove = [];
    for (var i = 0; i < viewer.imageryLayers.length; i++) {
      var layer = viewer.imageryLayers.get(i);
      var isWeather = false;
      for (var key in activeWeatherLayers) {
        if (activeWeatherLayers[key] === layer) {
          isWeather = true;
          break;
        }
      }
      if (!isWeather) {
        layersToRemove.push(layer);
      }
    }
    for (var j = 0; j < layersToRemove.length; j++) {
      viewer.imageryLayers.remove(layersToRemove[j]);
    }
  }

  function addIonBaseLayer() {
    if (!viewer) return;
    removeNonWeatherLayers();

    // Mark active synchronously so the layer panel + error watcher stay in sync
    activeBaseLayer = 'cesium-ion';
    baseLayerErrorCount = 0;
    baseLayerFallbackDone = false;
    console.log('CesiumGlobe: Loading Cesium Ion World Imagery...');

    function onIonProvider(provider) {
      // User may have switched layers while Ion was loading
      if (activeBaseLayer !== 'cesium-ion') return;
      try {
        var layer = viewer.imageryLayers.addImageryProvider(provider);
        layer.alpha = 1.0;
        console.log('CesiumGlobe: Added base layer: cesium-ion');
        watchBaseLayerErrors(layer, 'cesium-ion');
        viewer.scene.requestRender();
      } catch (e) {
        console.error('CesiumGlobe: Failed to add Ion layer:', e && e.message);
        addBaseLayer('standard');
        if (typeof baseLayerFailureHandler === 'function') {
          try { baseLayerFailureHandler('cesium-ion'); } catch (err) {}
        }
      }
    }

    function onIonError(err) {
      console.error('CesiumGlobe: Ion imagery failed:', err && err.message);
      if (activeBaseLayer === 'cesium-ion') {
        addBaseLayer('standard');
        if (typeof baseLayerFailureHandler === 'function') {
          try { baseLayerFailureHandler('cesium-ion'); } catch (e) {}
        }
      }
    }

    try {
      // Token comes from /api/config (env, not git). Wait for it first —
      // without a token Ion returns 401 and we fall back to Streets.
      ensureIonToken().then(function () {
        if (activeBaseLayer !== 'cesium-ion') return;
        if (!Cesium.Ion.defaultAccessToken) {
          onIonError(new Error('Missing CESIUM_ION_TOKEN — set it in .env / Vercel env'));
          return;
        }
        // Preferred modern API (Cesium 1.104+): uses Ion.defaultAccessToken
        if (typeof Cesium.createWorldImageryAsync === 'function') {
          Cesium.createWorldImageryAsync().then(onIonProvider, onIonError);
          return;
        }
        // Fallback: explicit Ion asset (2 = Cesium World Imagery)
        if (Cesium.IonImageryProvider && typeof Cesium.IonImageryProvider.fromAssetId === 'function') {
          Cesium.IonImageryProvider.fromAssetId(2).then(onIonProvider, onIonError);
          return;
        }
        // Legacy sync API
        var legacy = new Cesium.IonImageryProvider({ assetId: 2 });
        onIonProvider(legacy);
      }, onIonError);
    } catch (e) {
      onIonError(e);
    }
  }

  function addBaseLayer(type) {
    if (!viewer) return;

    // Ion is async — handled separately
    if (type === 'cesium-ion') {
      addIonBaseLayer();
      return;
    }

    removeNonWeatherLayers();

    var config = BASE_LAYERS[type];
    if (!config) return;

    try {
      // Fresh error budget for the newly selected layer
      baseLayerErrorCount = 0;
      baseLayerFallbackDone = false;

      var layer = viewer.imageryLayers.addImageryProvider(createImageryProvider(config));
      layer.alpha = 1.0;
      activeBaseLayer = type;
      console.log('CesiumGlobe: Added base layer:', type);

      // If this provider's tiles keep failing (403s, outages, CORS blocks),
      // stop hammering it and fall back to the reliable OSM standard base
      // instead of spamming the console and leaving a blank globe.
      watchBaseLayerErrors(layer, type);
    } catch (e) {
      console.error('CesiumGlobe: Failed to add base layer ' + type + ':', e.message);
      // Fallback: try default OSM
      if (type !== 'standard') {
        try {
          var fallbackLayer = viewer.imageryLayers.addImageryProvider(createImageryProvider(BASE_LAYERS.standard));
          fallbackLayer.alpha = 1.0;
          activeBaseLayer = 'standard';
          console.log('CesiumGlobe: Fell back to standard OSM');
        } catch (e2) {
          console.error('CesiumGlobe: Even OSM fallback failed:', e2.message);
        }
      }
    }
  }

  /**
   * Watch a base layer for repeated tile failures and fall back to the
   * reliable OSM standard base when the provider is unusable (e.g. Esri 403s,
   * Ion quota, CARTO errors). OSM is the final fallback — never fall back
   * *to* a broken provider.
   */
  function watchBaseLayerErrors(layer, type) {
    if (!layer || !layer.errorEvent) return;
    // OSM standard is the final fallback itself — nothing to fall back to
    if (type === 'standard') return;

    try {
      layer.errorEvent.addEventListener(function () {
        // Ignore errors for layers that are no longer active
        if (activeBaseLayer !== type || baseLayerFallbackDone) return;
        baseLayerErrorCount++;
        if (baseLayerErrorCount >= BASE_LAYER_ERROR_THRESHOLD) {
          baseLayerFallbackDone = true;
          console.warn(
            'CesiumGlobe: Base layer "' + type + '" failed ' +
            baseLayerErrorCount + ' tiles — falling back to standard map.'
          );
          addBaseLayer('standard');
          if (typeof baseLayerFailureHandler === 'function') {
            try { baseLayerFailureHandler(type); } catch (e) {}
          }
        }
      });
    } catch (e) { /* errorEvent unavailable — skip watching */ }
  }

  function setBaseLayerFailureHandler(fn) {
    baseLayerFailureHandler = (typeof fn === 'function') ? fn : null;
  }

  /**
   * Toggle a weather overlay layer
   */
  function toggleWeatherLayer(type) {
    if (!viewer) return false;

    if (activeWeatherLayers[type]) {
      viewer.imageryLayers.remove(activeWeatherLayers[type]);
      delete activeWeatherLayers[type];
      return false;
    }

    var config = WEATHER_LAYERS[type];
    if (!config) return false;

    try {
      var layer = viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: config.url,
          maximumLevel: 10,
          tilingScheme: new Cesium.WebMercatorTilingScheme(),
          credit: '\u00A9 OpenWeatherMap'
        })
      );
      layer.alpha = config.opacity;
      activeWeatherLayers[type] = layer;
      return true;
    } catch (e) {
      console.error('CesiumGlobe: Weather layer ' + type + ' failed:', e.message);
      return false;
    }
  }

  function isWeatherLayerActive(type) { return !!activeWeatherLayers[type]; }

  function setWeatherLayerOpacity(type, opacity) {
    if (activeWeatherLayers[type]) activeWeatherLayers[type].alpha = opacity;
  }

  function flyToLocation(lat, lon, height, heading, pitch) {
    if (!viewer) return;
    // Default: top-down view from ~800m altitude (search results)
    height = height || 800;
    heading = heading || 0;
    // Default pitch: -90 = looking straight down from above (satellite view)
    pitch = (pitch !== undefined) ? pitch : Cesium.Math.toRadians(-90);
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
      orientation: { heading: heading, pitch: pitch, roll: 0 },
      duration: 2.0
    });
  }

  function flyToUserLocation(lat, lon) {
    // Fly to 200m altitude, looking straight down (close satellite view ~200m)
    flyToLocation(lat, lon, 200, 0, Cesium.Math.toRadians(-90));
  }

  function resetCamera() {
    if (!viewer) return;
    // Reset to global top-down view (zoomed out to see the whole earth)
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(20, 25, 8000000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-70), roll: 0 },
      duration: 2.0
    });
  }

  function zoomIn() { if (viewer) viewer.camera.zoomIn(500000); }
  function zoomOut() { if (viewer) viewer.camera.zoomOut(500000); }
  function tiltCamera() { if (viewer) viewer.camera.pitch -= Cesium.Math.toRadians(15); }

  function resetOrientation() {
    if (viewer) viewer.camera.setView({ orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 } });
  }

  function setMarker(lat, lon, cityName, temp, condition) {
    if (!viewer) return;
    removeMarker();

    currentMarker = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
      point: {
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString('#00dbe7'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      },
      label: {
        text: cityName + '\n' + temp + '\u00B0 ' + condition,
        font: '13px Inter, sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.fromCssColorString('#0b0c3d'),
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('#191a4a').withAlpha(0.85),
        backgroundPadding: new Cesium.Cartesian2(8, 6),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      billboard: {
        image: createMarkerCanvas(),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -8),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: 0.8
      }
    });
  }

  function createMarkerCanvas() {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 80;
    var ctx = c.getContext('2d');
    ctx.beginPath(); ctx.arc(32, 28, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#191a4a'; ctx.fill();
    ctx.strokeStyle = '#00dbe7'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, 52); ctx.lineTo(24, 68); ctx.lineTo(40, 68); ctx.closePath();
    ctx.fillStyle = '#191a4a'; ctx.fill();
    ctx.strokeStyle = '#00dbe7'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(32, 28, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 219, 231, 0.15)'; ctx.fill();
    return c.toDataURL();
  }

  function removeMarker() {
    if (viewer && currentMarker) { viewer.entities.remove(currentMarker); currentMarker = null; }
  }

  function getCameraPosition() {
    if (!viewer) return null;
    var carto = viewer.camera.cartographic;
    return { latitude: Cesium.Math.toDegrees(carto.latitude), longitude: Cesium.Math.toDegrees(carto.longitude), height: carto.height };
  }

  function isWebGLAvailable() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function destroy() {
    if (viewer) { viewer.destroy(); viewer = null; initialized = false; activeWeatherLayers = {}; currentMarker = null; }
  }

  function isInitialized() { return initialized && !!viewer; }

  function getWeatherLayerTypes() {
    return Object.keys(WEATHER_LAYERS).map(function (k) { return { id: k, name: WEATHER_LAYERS[k].name, icon: WEATHER_LAYERS[k].icon }; });
  }

  function getBaseLayerTypes() {
    return Object.keys(BASE_LAYERS).map(function (k) { return { id: k, name: BASE_LAYERS[k].name, icon: BASE_LAYERS[k].icon }; });
  }

  function getActiveBaseLayer() { return activeBaseLayer; }

  return {
    init: init, destroy: destroy, isInitialized: isInitialized, isWebGLAvailable: isWebGLAvailable,
    flyToLocation: flyToLocation, flyToUserLocation: flyToUserLocation, resetCamera: resetCamera,
    zoomIn: zoomIn, zoomOut: zoomOut, tiltCamera: tiltCamera, resetOrientation: resetOrientation,
    setMarker: setMarker, removeMarker: removeMarker,
    addBaseLayer: addBaseLayer, setBaseLayerFailureHandler: setBaseLayerFailureHandler,
    toggleWeatherLayer: toggleWeatherLayer,
    isWeatherLayerActive: isWeatherLayerActive, setWeatherLayerOpacity: setWeatherLayerOpacity,
    getCameraPosition: getCameraPosition, getWeatherLayerTypes: getWeatherLayerTypes,
    getBaseLayerTypes: getBaseLayerTypes, getActiveBaseLayer: getActiveBaseLayer
  };
})();

window.CesiumGlobe = CesiumGlobe;
