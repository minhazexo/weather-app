/**
 * SkyLens CesiumJS 3D Weather Globe
 * Uses only UrlTemplateImageryProvider with CORS-safe free tile sources.
 */

var CesiumGlobe = (function () {
  'use strict';

  var viewer = null;
  var initialized = false;
  var currentMarker = null;
  var activeBaseLayer = 'cartodb-dark';
  var activeWeatherLayers = {};
  var initInProgress = false;

  // Base imagery tile sources - all use UrlTemplateImageryProvider for reliability
  var BASE_LAYERS = {
    'cartodb-dark': {
      name: 'Dark',
      icon: 'dark_mode',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      credit: '\u00A9 CARTO',
      subdomains: ['a', 'b', 'c', 'd']
    },
    satellite: {
      name: 'Satellite',
      icon: 'satellite',
      // ESRI World Imagery tiles - free, CORS-safe, no API key needed
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      credit: '\u00A9 Esri',
      subdomains: []
    },
    standard: {
      name: 'Streets',
      icon: 'map',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      credit: '\u00A9 OpenStreetMap contributors',
      subdomains: ['a', 'b', 'c']
    }
  };

  // Weather tile layers
  var WEATHER_LAYERS = {
    clouds: {
      name: 'Clouds',
      icon: 'cloud',
      url: 'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=c41ac4dcbbb1459860ff8f6d9d65096c',
      opacity: 0.5
    },
    precipitation: {
      name: 'Precipitation',
      icon: 'rainy',
      url: 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=c41ac4dcbbb1459860ff8f6d9d65096c',
      opacity: 0.6
    },
    temperature: {
      name: 'Temperature',
      icon: 'thermostat',
      url: 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=c41ac4dcbbb1459860ff8f6d9d65096c',
      opacity: 0.5
    },
    wind: {
      name: 'Wind',
      icon: 'air',
      url: 'https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=c41ac4dcbbb1459860ff8f6d9d65096c',
      opacity: 0.5
    },
    pressure: {
      name: 'Pressure',
      icon: 'compress',
      url: 'https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=c41ac4dcbbb1459860ff8f6d9d65096c',
      opacity: 0.4
    }
  };

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

      // Set Ion token for potential future use
      try {
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NDQzNDEsImlhdCI6MTYxMzY2NzY0OH0.gn0FXMuFRoc6mLiq4BZQOu5dNowJFxCCHN0HfvoeYEA';
      } catch (e) { /* token not critical */ }

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

      // Add satellite imagery using UrlTemplateImageryProvider (CORS-safe)
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
  function addBaseLayer(type) {
    if (!viewer) return;

    // Remove existing non-weather layers
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

    var config = BASE_LAYERS[type];
    if (!config) return;

    try {
      var layer = viewer.imageryLayers.addImageryProvider(createImageryProvider(config));
      layer.alpha = 1.0;
      activeBaseLayer = type;
      console.log('CesiumGlobe: Added base layer:', type);
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
    addBaseLayer: addBaseLayer, toggleWeatherLayer: toggleWeatherLayer,
    isWeatherLayerActive: isWeatherLayerActive, setWeatherLayerOpacity: setWeatherLayerOpacity,
    getCameraPosition: getCameraPosition, getWeatherLayerTypes: getWeatherLayerTypes,
    getBaseLayerTypes: getBaseLayerTypes, getActiveBaseLayer: getActiveBaseLayer
  };
})();

window.CesiumGlobe = CesiumGlobe;
