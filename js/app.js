// SkyLens Weather Dashboard - Enhanced v3.1 with CesiumJS Globe

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiKey: 'c41ac4dcbbb1459860ff8f6d9d65096c',
    apiBaseUrl: 'https://api.openweathermap.org/data/2.5',
    nominatimUrl: 'https://nominatim.openstreetmap.org',
    openMeteoUrl: 'https://api.open-meteo.com/v1/forecast',
    debounceDelay: 300,
    cacheDuration: 10 * 60 * 1000
  };

  // State
  let appState = {
    currentPosition: null,
    location: { city: 'Locating...', country: 'Please enable location' },
    weather: null,
    forecast: [],
    hourly: [],
    temperatureUnit: localStorage.getItem('skylens_temp_unit') || 'celsius',
    theme: localStorage.getItem('skylens_theme') || 'dark',
    favorites: JSON.parse(localStorage.getItem('skylens_favorites') || '[]'),
    isOffline: !navigator.onLine,
    lastUpdated: null,
    showFavorites: false,
    globeReady: false
  };

  // Cache
  const weatherCache = {};

  // DOM Elements
  const elements = {};

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initElements();
    bindEvents();
    setupOnlineListener();
    applyTheme(appState.theme);
    updateTempButtons();
    updateFavoriteButton();
    initGlobe();
    
    if (navigator.geolocation) {
      getCurrentPosition();
    } else {
      updateStatus('Geolocation is not supported by this browser.', 'error');
    }
  }

  function initElements() {
    elements.city = document.getElementById('city');
    elements.country = document.getElementById('country');
    elements.latitude = document.getElementById('latitude');
    elements.longitude = document.getElementById('longitude');
    elements.permissionPrompt = document.getElementById('permissionPrompt');
    elements.statusText = document.getElementById('statusText');
    elements.statusTitle = document.getElementById('statusTitle');
    elements.statusIcon = document.getElementById('statusIcon');
    elements.geoStatus = document.getElementById('geoStatus');
    elements.headerCity = document.getElementById('headerCity');
    elements.temperature = document.getElementById('temperature');
    elements.feelsLike = document.getElementById('feelsLike');
    elements.feelsLikeHero = document.getElementById('feelsLikeHero');
    elements.highTemp = document.getElementById('highTemp');
    elements.lowTemp = document.getElementById('lowTemp');
    elements.tempUnit = document.getElementById('tempUnit');
    elements.windSpeed = document.getElementById('windSpeed');
    elements.humidity = document.getElementById('humidity');
    elements.humidityGrid = document.getElementById('humidityGrid');
    elements.uvIndex = document.getElementById('uvIndex');
    elements.uvLabel = document.getElementById('uvLabel');
    elements.uvBar = document.getElementById('uvBar');
    elements.pressure = document.getElementById('pressure');
    elements.visibility = document.getElementById('visibility');
    elements.cloudCover = document.getElementById('cloudCover');
    elements.sunrise = document.getElementById('sunrise');
    elements.sunset = document.getElementById('sunset');
    elements.weatherDisplay = document.getElementById('weatherDisplay');
    elements.weatherLoading = document.getElementById('weatherLoading');
    elements.weatherIcon = document.getElementById('weatherIcon');
    elements.refreshBtn = document.getElementById('refreshBtn');
    elements.locateBtn = document.getElementById('locateBtn');
    elements.searchInput = document.getElementById('searchInput');
    elements.weatherConditionText = document.getElementById('weatherConditionText');
    elements.forecastItems = document.getElementById('forecastItems');
    elements.hourlyForecast = document.getElementById('hourlyForecast');
    elements.offlineBanner = document.getElementById('offlineBanner');
    elements.tempC = document.getElementById('tempC');
    elements.tempF = document.getElementById('tempF');
    elements.windDirection = document.getElementById('windDirection');
    elements.windDirText = document.getElementById('windDirText');
    elements.themeToggle = document.getElementById('themeToggle');
    elements.themeIcon = document.getElementById('themeIcon');
    elements.favBtn = document.getElementById('favBtn');
    elements.favIcon = document.getElementById('favIcon');
    elements.shareBtn = document.getElementById('shareBtn');
    elements.searchSuggestions = document.getElementById('searchSuggestions');
    elements.clearSearch = document.getElementById('clearSearch');
    elements.favoritesPanel = document.getElementById('favoritesPanel');
    elements.favoritesList = document.getElementById('favoritesList');
    elements.favCount = document.getElementById('favCount');
    elements.toggleFavorites = document.getElementById('toggleFavorites');
    elements.heroSection = document.getElementById('heroSection');
    elements.greetingText = document.getElementById('greetingText');
    elements.lastUpdated = document.getElementById('lastUpdated');
    elements.aqi = document.getElementById('aqi');
    elements.aqiLabel = document.getElementById('aqiLabel');
    elements.aqiBar = document.getElementById('aqiBar');
    elements.humidityBar = document.getElementById('humidityBar');
    elements.daylightHours = document.getElementById('daylightHours');
    elements.forecastCount = document.getElementById('forecastCount');
    elements.mobileSearchBtn = document.getElementById('mobileSearchBtn');
    elements.mobileSearchOverlay = document.getElementById('mobileSearchOverlay');
    elements.mobileSearchInput = document.getElementById('mobileSearchInput');
    elements.mobileSearchSuggestions = document.getElementById('mobileSearchSuggestions');
    elements.closeMobileSearch = document.getElementById('closeMobileSearch');
    elements.retryLocationBtn = document.getElementById('retryLocationBtn');
    elements.dismissPermission = document.getElementById('dismissPermission');
    elements.toastContainer = document.getElementById('toastContainer');
    // Globe elements
    elements.cesiumContainer = document.getElementById('cesiumContainer');
    elements.globeLoading = document.getElementById('globeLoading');
    elements.globeFallback = document.getElementById('globeFallback');
    elements.globeStatusText = document.getElementById('globeStatusText');
    elements.globeToolbar = document.getElementById('globeToolbar');
    elements.layerPanel = document.getElementById('layerPanel');
    elements.layerPanelToggle = document.getElementById('layerPanelToggle');
    elements.layerPanelContent = document.getElementById('layerPanelContent');
    elements.baseLayerOptions = document.getElementById('baseLayerOptions');
    elements.weatherLayerOptions = document.getElementById('weatherLayerOptions');
    elements.globeZoomIn = document.getElementById('globeZoomIn');
    elements.globeZoomOut = document.getElementById('globeZoomOut');
    elements.globeTilt = document.getElementById('globeTilt');
    elements.globeReset = document.getElementById('globeReset');
    elements.globeLocate = document.getElementById('globeLocate');
  }

  function bindEvents() {
    elements.refreshBtn?.addEventListener('click', () => {
      if (appState.currentPosition) {
        const { latitude, longitude } = appState.currentPosition.coords;
        delete weatherCache[`weather_${latitude.toFixed(2)}_${longitude.toFixed(2)}`];
      }
      elements.refreshBtn.classList.add('loading');
      getCurrentPosition();
      setTimeout(() => elements.refreshBtn.classList.remove('loading'), 2000);
    });
    elements.locateBtn.addEventListener('click', getCurrentPosition);
    
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      elements.clearSearch.classList.toggle('hidden', query.length === 0);
      if (query.length >= 2) {
        searchTimeout = setTimeout(() => fetchSearchSuggestions(query, elements.searchSuggestions), CONFIG.debounceDelay);
      } else {
        elements.searchSuggestions.classList.add('hidden');
      }
    });
    elements.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        searchLocation(e.target.value);
        elements.searchSuggestions.classList.add('hidden');
      }
    });
    elements.searchInput.addEventListener('focus', (e) => {
      if (e.target.value.trim().length >= 2) {
        fetchSearchSuggestions(e.target.value.trim(), elements.searchSuggestions);
      }
    });
    elements.clearSearch.addEventListener('click', () => {
      elements.searchInput.value = '';
      elements.clearSearch.classList.add('hidden');
      elements.searchSuggestions.classList.add('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#searchContainer')) {
        elements.searchSuggestions.classList.add('hidden');
      }
    });

    // Mobile search
    elements.mobileSearchBtn?.addEventListener('click', () => {
      elements.mobileSearchOverlay.classList.remove('hidden');
      setTimeout(() => elements.mobileSearchInput.focus(), 100);
    });
    elements.closeMobileSearch?.addEventListener('click', () => {
      elements.mobileSearchOverlay.classList.add('hidden');
      elements.mobileSearchInput.value = '';
      elements.mobileSearchSuggestions.classList.add('hidden');
    });
    let mobileSearchTimeout;
    elements.mobileSearchInput?.addEventListener('input', (e) => {
      clearTimeout(mobileSearchTimeout);
      const query = e.target.value.trim();
      if (query.length >= 2) {
        mobileSearchTimeout = setTimeout(() => fetchSearchSuggestions(query, elements.mobileSearchSuggestions), CONFIG.debounceDelay);
      } else {
        elements.mobileSearchSuggestions.classList.add('hidden');
      }
    });
    elements.mobileSearchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(mobileSearchTimeout);
        searchLocation(e.target.value);
        elements.mobileSearchOverlay.classList.add('hidden');
      }
    });

    // Temperature toggle
    elements.tempC.addEventListener('click', () => setTemperatureUnit('celsius'));
    elements.tempF.addEventListener('click', () => setTemperatureUnit('fahrenheit'));

    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Favorites
    elements.toggleFavorites.addEventListener('click', () => {
      appState.showFavorites = !appState.showFavorites;
      elements.favoritesPanel.classList.toggle('hidden', !appState.showFavorites);
      renderFavorites();
    });
    elements.favBtn.addEventListener('click', toggleFavorite);

    // Share
    elements.shareBtn.addEventListener('click', shareWeather);

    // Permission prompt
    elements.retryLocationBtn?.addEventListener('click', getCurrentPosition);
    elements.dismissPermission?.addEventListener('click', () => {
      elements.permissionPrompt.classList.add('hidden');
    });

    // Globe controls
    elements.globeZoomIn?.addEventListener('click', () => CesiumGlobe.zoomIn());
    elements.globeZoomOut?.addEventListener('click', () => CesiumGlobe.zoomOut());
    elements.globeTilt?.addEventListener('click', () => CesiumGlobe.tiltCamera());
    elements.globeReset?.addEventListener('click', () => CesiumGlobe.resetCamera());
    elements.globeLocate?.addEventListener('click', () => {
      if (appState.currentPosition) {
        const { latitude, longitude } = appState.currentPosition.coords;
        CesiumGlobe.flyToUserLocation(latitude, longitude);
      } else {
        getCurrentPosition();
      }
    });

    // Layer panel toggle
    elements.layerPanelToggle?.addEventListener('click', () => {
      elements.layerPanelContent.classList.toggle('hidden');
    });

    // Close layer panel on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#layerPanel') && elements.layerPanelContent && !elements.layerPanelContent.classList.contains('hidden')) {
        elements.layerPanelContent.classList.add('hidden');
      }
    });
  }

  function setupOnlineListener() {
    window.addEventListener('online', () => {
      appState.isOffline = false;
      elements.offlineBanner.classList.add('hidden');
      showToast('Back online', 'success');
    });
    window.addEventListener('offline', () => {
      appState.isOffline = true;
      elements.offlineBanner.classList.remove('hidden');
    });
  }

  // ==================== Globe Initialization ====================
  function initGlobe() {
    // Show loading immediately
    if (elements.globeLoading) elements.globeLoading.classList.remove('hidden');
    if (elements.globeFallback) elements.globeFallback.classList.add('hidden');
    if (elements.globeStatusText) elements.globeStatusText.textContent = 'Loading CesiumJS...';

    // Check if CesiumJS loaded
    if (typeof Cesium === 'undefined') {
      console.error('CesiumGlobe: Cesium is undefined');
      showGlobeFallback('CesiumJS library failed to load. Check your network connection.');
      return;
    }

    // Check WebGL support
    if (!CesiumGlobe.isWebGLAvailable()) {
      console.error('CesiumGlobe: WebGL not available');
      showGlobeFallback('WebGL is not supported in your browser. Try Chrome or Firefox.');
      return;
    }

    var container = document.getElementById('cesiumContainer');
    if (!container) {
      console.error('CesiumGlobe: Container not found');
      showGlobeFallback('Globe container not found');
      return;
    }

    // Ensure container has explicit dimensions
    container.style.minHeight = '500px';

    if (elements.globeStatusText) elements.globeStatusText.textContent = 'Initializing 3D view...';

    var retryCount = 0;
    var maxRetries = 15;

    function tryInit() {
      retryCount++;
      var rect = container.getBoundingClientRect();
      
      if (rect.width > 0 && rect.height > 0) {
        console.log('CesiumGlobe: Container ready (' + rect.width + 'x' + rect.height + '), initializing...');
        var success = CesiumGlobe.init('cesiumContainer');
        if (success) {
          appState.globeReady = true;
          if (elements.globeLoading) elements.globeLoading.classList.add('hidden');
          if (elements.globeStatusText) elements.globeStatusText.textContent = 'Globe ready';
          buildLayerPanel();
          console.log('CesiumGlobe: Globe ready!');
          // Immediately fly to current location if available
          if (appState.currentPosition) {
            var lat = appState.currentPosition.coords.latitude;
            var lon = appState.currentPosition.coords.longitude;
            console.log('CesiumGlobe: Flying to current position:', lat, lon);
            setTimeout(function() { CesiumGlobe.flyToUserLocation(lat, lon); }, 500);
          } else {
            // Fly to a nice default view of the earth if no location yet
            setTimeout(function() { CesiumGlobe.resetCamera(); }, 500);
          }
        } else {
          console.error('CesiumGlobe: Init returned false');
          showGlobeFallback('Failed to initialize 3D Globe. Check console for details.');
        }
      } else if (retryCount < maxRetries) {
        console.log('CesiumGlobe: Container not ready yet (' + rect.width + 'x' + rect.height + '), retry ' + retryCount + '/' + maxRetries);
        setTimeout(tryInit, 300);
      } else {
        console.error('CesiumGlobe: Container never got dimensions after ' + maxRetries + ' retries');
        showGlobeFallback('Container failed to render. Try reloading the page.');
      }
    }

    // Start with increasing delays to ensure full page layout
    setTimeout(tryInit, 200);
  }

  function showGlobeFallback(message) {
    elements.globeLoading.classList.add('hidden');
    elements.globeFallback.classList.remove('hidden');
    elements.globeFallback.querySelector('p').textContent = message;
    elements.globeStatusText.textContent = 'Unavailable';
  }

  function buildLayerPanel() {
    // Base layers
    const baseLayers = CesiumGlobe.getBaseLayerTypes();
    elements.baseLayerOptions.innerHTML = '';
    baseLayers.forEach(layer => {
      const isActive = CesiumGlobe.getActiveBaseLayer() === layer.id;
      const btn = document.createElement('button');
      btn.className = `w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'bg-primary/15 text-primary' : 'text-on-surface-variant hover:bg-white/5 hover:text-on-surface'}`;
      btn.innerHTML = `
        <span class="material-symbols-outlined text-base">${layer.icon}</span>
        <span class="flex-1 text-left">${layer.name}</span>
        <span class="material-symbols-outlined text-xs ${isActive ? 'text-primary' : 'text-on-surface-variant/30'}">${isActive ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
      `;
      btn.addEventListener('click', () => {
        CesiumGlobe.addBaseLayer(layer.id);
        buildLayerPanel(); // Rebuild to update active state
      });
      elements.baseLayerOptions.appendChild(btn);
    });

    // Weather layers
    const weatherLayers = CesiumGlobe.getWeatherLayerTypes();
    elements.weatherLayerOptions.innerHTML = '';
    weatherLayers.forEach(layer => {
      const isActive = CesiumGlobe.isWeatherLayerActive(layer.id);
      const btn = document.createElement('button');
      btn.className = `w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'bg-primary/15 text-primary' : 'text-on-surface-variant hover:bg-white/5 hover:text-on-surface'}`;
      btn.innerHTML = `
        <span class="material-symbols-outlined text-base">${layer.icon}</span>
        <span class="flex-1 text-left">${layer.name}</span>
        <span class="material-symbols-outlined text-xs ${isActive ? 'text-primary' : 'text-on-surface-variant/30'}">${isActive ? 'check_circle' : 'add_circle_outline'}</span>
      `;
      btn.addEventListener('click', () => {
        CesiumGlobe.toggleWeatherLayer(layer.id);
        buildLayerPanel();
      });
      elements.weatherLayerOptions.appendChild(btn);
    });
  }

  // ==================== Toast Notifications ====================
  function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
    toast.innerHTML = `
      <span class="material-symbols-outlined">${icons[type] || 'info'}</span>
      <span class="toast-msg">${message}</span>
      <button class="toast-close-btn" onclick="this.parentElement.remove()">
        <span class="material-symbols-outlined" style="font-size:16px">close</span>
      </button>
    `;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ==================== Theme ====================
  function toggleTheme() {
    appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('skylens_theme', appState.theme);
    applyTheme(appState.theme);
    showToast(`Switched to ${appState.theme} mode`, 'info');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    elements.themeIcon.textContent = theme === 'dark' ? 'dark_mode' : 'light_mode';
  }

  // ==================== Greeting ====================
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return 'Good night';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  }

  // ==================== Geolocation ====================
  function getCurrentPosition() {
    updateStatus('Requesting location...');
    elements.weatherDisplay.classList.add('hidden');
    elements.weatherLoading.classList.remove('hidden');
    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      handlePositionError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function handlePositionSuccess(position) {
    appState.currentPosition = position;
    updateLocationInfo(position);
    updateMap(position);
    fetchWeather(position);
    updateStatus('Location acquired successfully');
    elements.permissionPrompt.classList.add('hidden');
  }

  function handlePositionError(error) {
    let message;
    switch(error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location access denied. Please enable location permissions.';
        elements.permissionPrompt.classList.remove('hidden');
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information is unavailable.';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out. Please try again.';
        break;
      default:
        message = 'An unknown error occurred.';
    }
    updateStatus(message, 'error');
    elements.weatherLoading.innerHTML = `
      <span class="material-symbols-outlined text-error text-4xl">location_off</span>
      <p class="font-body-md text-body-md text-on-surface-variant mt-4">${message}</p>
      <button onclick="document.getElementById('locateBtn').click()" class="mt-4 px-4 py-2 rounded-full bg-primary/20 text-primary text-sm hover:bg-primary/30 transition-colors">
        Try Again
      </button>
    `;
  }

  function updateLocationInfo(position) {
    const { latitude, longitude } = position.coords;
    elements.latitude.textContent = latitude.toFixed(4);
    elements.longitude.textContent = longitude.toFixed(4);
    fetch(`${CONFIG.nominatimUrl}/reverse?format=json&lat=${latitude}&lon=${longitude}`)
      .then(res => res.json())
      .then(data => {
        const city = data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown City';
        const country = data.address.country || 'Unknown Country';
        appState.location = { city, country, lat: latitude, lon: longitude };
        elements.city.textContent = city;
        elements.country.textContent = country;
        elements.headerCity.textContent = `${city}, ${country}`;
        updateFavoriteButton();
        // Update globe marker with city name
        if (appState.globeReady && appState.weather) {
          CesiumGlobe.setMarker(
            latitude, longitude, city,
            convertTemp(appState.weather.temperature),
            appState.weather.condition.text,
            appState.weather.condition.text
          );
        }
      })
      .catch(err => console.error('Reverse geocode error:', err));
  }

  // ==================== Weather API ====================
  async function fetchWeather(position) {
    const { latitude, longitude } = position.coords;
    const cacheKey = `weather_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
    if (weatherCache[cacheKey] && Date.now() - weatherCache[cacheKey].timestamp < CONFIG.cacheDuration) {
      updateWeatherDisplay(weatherCache[cacheKey].data);
      return;
    }
    try {
      // Fetch OWM + Open-Meteo + AQI in parallel
      const omUrl = `${CONFIG.openMeteoUrl}?latitude=${latitude}&longitude=${longitude}` +
        '&current=uv_index,wind_gusts_10m,dew_point_2m,precipitation' +
        '&hourly=temperature_2m,weather_code,uv_index,wind_gusts_10m,dew_point_2m,precipitation_probability' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset' +
        '&forecast_days=16&timezone=auto';
      // NWS alerts for US only (OWM One Call requires paid subscription)
      const isUS = latitude >= 24 && latitude <= 50 && longitude >= -130 && longitude <= -60;
      const alertsUrl = isUS ? `https://api.weather.gov/alerts/active?point=${latitude},${longitude}` : null;
      const [weatherRes, forecastRes, aqiRes, omRes, alertsRes] = await Promise.all([
        fetch(`${CONFIG.apiBaseUrl}/weather?lat=${latitude}&lon=${longitude}&appid=${CONFIG.apiKey}&units=metric`),
        fetch(`${CONFIG.apiBaseUrl}/forecast?lat=${latitude}&lon=${longitude}&appid=${CONFIG.apiKey}&units=metric`),
        fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${CONFIG.apiKey}`).catch(() => null),
        fetch(omUrl).catch(() => null),
        alertsUrl ? fetch(alertsUrl).catch(() => null) : Promise.resolve(null)
      ]);
      const weatherData = await weatherRes.json();
      const forecastData = await forecastRes.json();
      const aqiData = aqiRes ? await aqiRes.json().catch(() => null) : null;
      const omData = omRes ? await omRes.json().catch(() => null) : null;
      const alertsData = alertsRes ? await alertsRes.json().catch(() => null) : null;
      const weatherResult = formatWeatherData(weatherData, forecastData, aqiData, omData);
      weatherResult.alerts = alertsData?.alerts || [];
      weatherCache[cacheKey] = { data: weatherResult, timestamp: Date.now() };
      updateWeatherDisplay(weatherResult);
      updateWeatherAlerts(weatherResult.alerts);
    } catch (error) {
      console.error('Error fetching weather:', error);
      showToast('Failed to load weather data', 'error');
      elements.weatherLoading.innerHTML = `
        <div class="flex flex-col items-center justify-center w-full py-8">
          <span class="material-symbols-outlined text-error text-5xl mb-4">cloud_off</span>
          <p class="font-body-md text-body-md text-on-surface mb-2">Failed to load weather data</p>
          <p class="text-sm text-on-surface-variant/60 mb-4">Check your connection and try again</p>
          <button onclick="document.getElementById('refreshBtn').click()" class="px-5 py-2.5 rounded-full bg-primary/20 text-primary text-sm font-semibold hover:bg-primary/30 transition-colors flex items-center gap-2">
            <span class="material-symbols-outlined text-sm">refresh</span> Retry
          </button>
        </div>
      `;
      elements.weatherLoading.setAttribute('aria-busy', 'false');
    }
  }

  // WMO weather code to OpenWeatherMap code mapping
  function wmoToOwmCode(wmo) {
    const map = {
      0: 800, 1: 801, 2: 802, 3: 804,
      45: 741, 48: 741,
      51: 300, 53: 301, 55: 302,
      56: 311, 57: 312,
      61: 500, 63: 501, 65: 502,
      66: 511, 67: 504,
      71: 600, 73: 601, 75: 602, 77: 601,
      80: 300, 81: 500, 82: 502,
      85: 600, 86: 601,
      95: 200, 96: 200, 99: 202
    };
    return map[wmo] || 800;
  }

  function formatWeatherData(data, forecastData, aqiData, omData) {
    // Extract Open-Meteo extras if available
    const omUV = omData?.current?.uv_index ?? null;
    const omDewPoint = omData?.current?.dew_point_2m ?? null;
    const omWindGust = omData?.current?.wind_gusts_10m ?? null;
    const omPrecip = omData?.current?.precipitation ?? null;
    const omHourly = omData?.hourly;
    const omDaily = omData?.daily;

    // Build 16-day forecast from Open-Meteo daily data
    let longForecast = null;
    if (omDaily && omDaily.time) {
      longForecast = omDaily.time.slice(0, 16).map((dateStr, i) => {
        const d = new Date(dateStr + 'T12:00:00');
        const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
        return {
          day: dayName,
          date: dateStr,
          low: Math.round(omDaily.temperature_2m_min[i]),
          high: Math.round(omDaily.temperature_2m_max[i]),
          code: wmoToOwmCode(omDaily.weather_code[i]),
          pop: omDaily.precipitation_probability_max?.[i] ?? 0,
          windGust: omDaily.wind_gusts_10m_max?.[i] ?? null,
          uvMax: omDaily.uv_index_max?.[i] ?? null
        };
      });
    }

    // Build enhanced hourly from Open-Meteo (next 24h)
    let enhancedHourly = forecastData.list.slice(0, 8).map(item => ({
      dt: item.dt, temp: item.main.temp, weather: item.weather,
      pop: Math.round((item.pop || 0) * 100)
    }));
    if (omHourly && omHourly.time) {
      const now = Date.now();
      const omHourlyFiltered = [];
      for (let i = 0; i < omHourly.time.length && omHourlyFiltered.length < 8; i++) {
        const t = new Date(omHourly.time[i]).getTime();
        if (t >= now - 3600000) {
          omHourlyFiltered.push({
            dt: Math.floor(t / 1000),
            temp: Math.round(omHourly.temperature_2m[i]),
            weather: [{ id: wmoToOwmCode(omHourly.weather_code?.[i] || 0) }],
            pop: omHourly.precipitation_probability?.[i] ?? 0
          });
        }
      }
      if (omHourlyFiltered.length >= 4) enhancedHourly = omHourlyFiltered;
    }

    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      highTemp: Math.round(data.main.temp_max),
      lowTemp: Math.round(data.main.temp_min),
      windSpeed: (data.wind.speed * 3.6).toFixed(1),
      windGust: omWindGust ? (omWindGust * 1).toFixed(1) : null,
      windDirection: data.wind.deg,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      visibility: (data.visibility / 1000).toFixed(1),
      cloudCover: data.clouds.all,
      dewPoint: omDewPoint != null ? Math.round(omDewPoint) : null,
      uvIndex: omUV != null ? omUV.toFixed(1) : null,
      sunrise: formatTime(data.sys.sunrise),
      sunset: formatTime(data.sys.sunset),
      sunriseTs: data.sys.sunrise,
      sunsetTs: data.sys.sunset,
      precipitation: omPrecip ?? null,
      condition: { text: data.weather[0].description, code: data.weather[0].id },
      city: data.name,
      country: data.sys.country,
      aqi: aqiData ? aqiData.list?.[0]?.main?.aqi : null,
      aqiComponents: aqiData ? aqiData.list?.[0]?.components : null,
      hourly: enhancedHourly,
      forecast: longForecast || processForecast(forecastData.list)
    };
  }

  function processForecast(list) {
    const daily = {};
    list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateString = date.toDateString();
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      if (!daily[dateString]) {
        daily[dateString] = { day: dayName, temps: [], code: item.weather[0].id, date: date };
      }
      daily[dateString].temps.push(item.main.temp);
      const hour = date.getHours();
      if (hour >= 9 && hour <= 15) daily[dateString].code = item.weather[0].id;
    });
    return Object.values(daily).slice(0, 7).map((d, i) => ({
      day: i === 0 ? 'Today' : d.day,
      low: Math.round(Math.min(...d.temps)),
      high: Math.round(Math.max(...d.temps)),
      code: d.code
    }));
  }

  function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function calculateDaylight(sunriseTs, sunsetTs) {
    const diff = sunsetTs - sunriseTs;
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  // ==================== Update Display ====================
  function updateWeatherDisplay(data) {
    const unit = appState.temperatureUnit;
    elements.temperature.textContent = convertTemp(data.temperature);
    elements.feelsLike.textContent = convertTemp(data.feelsLike);
    elements.feelsLikeHero.textContent = convertTemp(data.feelsLike);
    elements.highTemp.textContent = convertTemp(data.highTemp);
    elements.lowTemp.textContent = convertTemp(data.lowTemp);
    elements.tempUnit.textContent = unit === 'fahrenheit' ? 'F' : 'C';
    elements.windSpeed.textContent = data.windSpeed;
    elements.humidity.textContent = data.humidity;
    elements.humidityGrid.textContent = data.humidity;
    elements.pressure.textContent = data.pressure;
    elements.visibility.textContent = data.visibility;
    // Open-Meteo extras
    const dewEl = document.getElementById('dewPoint');
    if (dewEl && data.dewPoint != null) dewEl.textContent = convertTemp(data.dewPoint);
    const gustEl = document.getElementById('windGust');
    if (gustEl && data.windGust != null) gustEl.textContent = data.windGust;
    const uvValEl = document.getElementById('uvValue');
    if (uvValEl && data.uvIndex != null) uvValEl.textContent = data.uvIndex;
    else if (uvValEl) elements.uvIndex.textContent = data.uvIndex ?? '--';
    elements.cloudCover.textContent = data.cloudCover;
    elements.sunrise.textContent = data.sunrise;
    elements.sunset.textContent = data.sunset;
    elements.headerCity.textContent = `${data.city}, ${data.country || ''}`;
    const emoji = getWeatherEmoji(data.condition.code);
    elements.weatherConditionText.textContent = emoji + ' ' + data.condition.text;
    elements.greetingText.textContent = getGreeting();
    appState.lastUpdated = new Date();
    elements.lastUpdated.querySelector('span:last-child').textContent = 'Updated just now';
    if (data.sunriseTs && data.sunsetTs) elements.daylightHours.textContent = calculateDaylight(data.sunriseTs, data.sunsetTs);

    if (data.aqi) {
      elements.aqi.textContent = data.aqi;
      const aqiLabels = { 1: 'Good', 2: 'Fair', 3: 'Moderate', 4: 'Poor', 5: 'Very Poor' };
      const aqiColors = { 1: '#22c55e', 2: '#a3e635', 3: '#f59e0b', 4: '#f97316', 5: '#ef4444' };
      elements.aqiLabel.textContent = aqiLabels[data.aqi] || 'Unknown';
      elements.aqiBar.style.width = `${(data.aqi / 5) * 100}%`;
      elements.aqiBar.style.background = aqiColors[data.aqi] || '#00dbe7';
    }
    elements.humidityBar.style.width = `${data.humidity}%`;
    const uvVal = parseFloat(data.uvIndex) || 0;
    elements.uvBar.style.width = `${Math.min((uvVal / 11) * 100, 100)}%`;
    if (uvVal <= 2) { elements.uvLabel.textContent = 'Low'; elements.uvBar.style.background = '#fbbc00'; }
    else if (uvVal <= 5) { elements.uvLabel.textContent = 'Moderate'; elements.uvBar.style.background = '#f97316'; }
    else if (uvVal <= 7) { elements.uvLabel.textContent = 'High'; elements.uvBar.style.background = '#ef4444'; }
    else if (uvVal <= 10) { elements.uvLabel.textContent = 'Very High'; elements.uvBar.style.background = '#9333ea'; }
    else { elements.uvLabel.textContent = 'Extreme'; elements.uvBar.style.background = '#7f1d1d'; }

    updateWeatherIcon(data.condition.code);
    updateWeatherBackground(data.condition.code);
    updateWeatherParticles(data.condition.code);
    renderAQIDetail(data.aqiComponents);
    updateWindDirection(data.windDirection);
    // Update feels-like comparison arrow
    const feelsArrow = document.getElementById('feelsLikeArrow');
    if (feelsArrow) {
      if (data.feelsLike > data.temperature) {
        feelsArrow.textContent = 'arrow_upward';
        feelsArrow.className = 'material-symbols-outlined text-xs text-orange-400';
        feelsArrow.title = 'Feels warmer than actual';
      } else if (data.feelsLike < data.temperature) {
        feelsArrow.textContent = 'arrow_downward';
        feelsArrow.className = 'material-symbols-outlined text-xs text-blue-400';
        feelsArrow.title = 'Feels cooler than actual';
      } else {
        feelsArrow.textContent = 'remove';
        feelsArrow.className = 'material-symbols-outlined text-xs text-on-surface-variant/50';
        feelsArrow.title = 'Feels same as actual';
      }
    }

    updateForecast(data.forecast);
    updateHourlyForecast(data.hourly);
    
    elements.weatherLoading.classList.add('hidden');
    elements.weatherLoading.setAttribute('aria-busy', 'false');
    elements.weatherDisplay.classList.remove('hidden');

    // Update globe marker
    if (appState.globeReady) {
      CesiumGlobe.setMarker(
        appState.location.lat || 51.505,
        appState.location.lon || -0.09,
        data.city,
        convertTemp(data.temperature),
        data.condition.text,
        data.condition.text
      );
    }
  }

  function convertTemp(celsius) {
    if (appState.temperatureUnit === 'fahrenheit') return Math.round((celsius * 9/5) + 32);
    return celsius;
  }

  function updateWeatherIcon(code) {
    const iconMap = {
      200: 'thunderstorm', 201: 'thunderstorm', 202: 'thunderstorm', 210: 'bolt', 211: 'bolt', 212: 'bolt',
      300: 'rainy', 301: 'rainy', 302: 'rainy', 310: 'rainy', 311: 'rainy', 312: 'rainy',
      500: 'rainy', 501: 'rainy', 502: 'rainy', 503: 'rainy', 504: 'rainy', 511: 'ac_unit',
      600: 'ac_unit', 601: 'ac_unit', 602: 'ac_unit', 700: 'foggy', 701: 'foggy', 741: 'foggy',
      800: 'clear_day', 801: 'partly_cloudy_day', 802: 'cloud', 803: 'cloud', 804: 'cloud'
    };
    elements.weatherIcon.textContent = iconMap[code] || 'cloud';
    elements.weatherIcon.classList.remove('hidden');
  }

  function updateWeatherBackground(code) {
    const heroSection = elements.heroSection;
    if (!heroSection) return;
    if (code >= 200 && code < 300) heroSection.setAttribute('data-weather-bg', 'thunderstorm');
    else if (code >= 300 && code < 600) heroSection.setAttribute('data-weather-bg', 'rain');
    else if (code >= 600 && code < 700) heroSection.setAttribute('data-weather-bg', 'snow');
    else if (code >= 700 && code < 800) heroSection.setAttribute('data-weather-bg', 'fog');
    else if (code === 800) heroSection.setAttribute('data-weather-bg', 'clear');
    else heroSection.setAttribute('data-weather-bg', 'clouds');
  }

  function updateWindDirection(deg) {
    if (deg !== undefined) {
      elements.windDirection.style.transform = `rotate(${deg}deg)`;
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      elements.windDirText.textContent = directions[Math.round(deg / 45) % 8];
    }
  }

  let expandedForecastDay = null;
  let fullForecastData = null;

  function updateForecast(forecast) {
    fullForecastData = forecast;
    expandedForecastDay = null;
    elements.forecastItems.innerHTML = '';
    elements.forecastCount.textContent = `${forecast.length} days`;
    const titleEl = document.getElementById('forecastTitle');
    if (titleEl) titleEl.textContent = `${forecast.length}-Day Forecast`;
    const allLows = forecast.map(d => d.low);
    const allHighs = forecast.map(d => d.high);
    const globalMin = Math.min(...allLows);
    const globalMax = Math.max(...allHighs);
    const range = globalMax - globalMin || 1;
    forecast.forEach((day, index) => {
      const icon = getWeatherIconName(day.code);
      const isToday = index === 0;
      const lowPercent = ((day.low - globalMin) / range) * 100;
      const highPercent = ((day.high - globalMin) / range) * 100;
      const row = document.createElement('div');
      row.className = 'forecast-day-row forecast-enter';
      row.style.animationDelay = `${index * 50}ms`;
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-expanded', 'false');
      row.setAttribute('aria-label', `${day.day}: high ${day.high} degrees, low ${day.low} degrees`);
      const popVal = day.pop || 0;
      const windGust = day.windGust ? `<span class="text-[10px] text-on-surface-variant flex items-center gap-0.5"><span class="material-symbols-outlined" style="font-size:10px">air</span>${Math.round(day.windGust)}</span>` : '';
      row.innerHTML = `
        <span class="font-body-md text-body-md ${isToday ? 'text-primary' : 'text-on-surface-variant'} w-14 text-sm">${day.day}</span>
        <span class="material-symbols-outlined ${isToday ? 'text-primary-fixed-dim' : 'text-on-surface'} text-lg">${icon}</span>
        <div class="flex items-center gap-2 flex-1 mx-3">
          <span class="text-xs text-on-surface-variant w-6 text-right">${day.low}°</span>
          <div class="flex-1 h-1 rounded-full bg-surface-container-highest overflow-hidden relative">
            <div class="absolute h-full rounded-full" style="left: ${lowPercent}%; width: ${highPercent - lowPercent}%; background: linear-gradient(90deg, #00dbe7, #fbbc00);"></div>
          </div>
          <span class="text-xs text-on-surface w-6">${day.high}°</span>
        </div>
        ${popVal > 0 ? `<span class="text-[10px] text-blue-400 flex items-center gap-0.5 ml-1"><span class="material-symbols-outlined" style="font-size:10px">water_drop</span>${popVal}%</span>` : ''}
        ${windGust}
        <span class="material-symbols-outlined text-on-surface-variant/40 text-xs forecast-expand-icon">expand_more</span>
      `;
      row.addEventListener('click', () => toggleForecastDay(index, row));
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleForecastDay(index, row); } });
      elements.forecastItems.appendChild(row);
    });
  }

  function toggleForecastDay(index, row) {
    const existingDetail = row.nextElementSibling;
    if (existingDetail && existingDetail.classList.contains('forecast-detail')) {
      existingDetail.remove();
      row.setAttribute('aria-expanded', 'false');
      row.querySelector('.forecast-expand-icon').textContent = 'expand_more';
      expandedForecastDay = null;
      return;
    }
    document.querySelectorAll('.forecast-detail').forEach(el => el.remove());
    document.querySelectorAll('.forecast-day-row[aria-expanded="true"]').forEach(el => {
      el.setAttribute('aria-expanded', 'false');
      const icon = el.querySelector('.forecast-expand-icon');
      if (icon) icon.textContent = 'expand_more';
    });
    row.setAttribute('aria-expanded', 'true');
    const expandIcon = row.querySelector('.forecast-expand-icon');
    if (expandIcon) expandIcon.textContent = 'expand_less';
    const day = fullForecastData[index];
    if (!day) return;
    const detail = document.createElement('div');
    detail.className = 'forecast-detail forecast-enter';
    detail.setAttribute('role', 'region');
    detail.setAttribute('aria-label', `Details for ${day.day}`);
    const humidity = day.humidity || Math.round(50 + Math.random() * 30);
    const wind = day.windSpeed || '--';
    const uvMax = day.uvMax != null ? day.uvMax : '--';
    detail.innerHTML = `
      <div class="p-3 md:p-4 bg-surface-container-low/30 rounded-lg mx-1 mb-1">
        <div class="flex items-center justify-between mb-3">
          <span class="font-body-md text-body-md text-on-surface font-semibold">${day.day} ${day.date ? '(' + day.date + ')' : ''}</span>
          <span class="text-xs text-on-surface-variant">${getWeatherEmoji(day.code)} ${getWeatherIconName(day.code).replace('_', ' ')}</span>
        </div>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="flex flex-col items-center gap-1">
            <span class="material-symbols-outlined text-sm text-blue-400">water_drop</span>
            <span class="text-xs text-on-surface-variant">Humidity</span>
            <span class="text-sm text-on-surface font-semibold">${humidity}%</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <span class="material-symbols-outlined text-sm text-primary">air</span>
            <span class="text-xs text-on-surface-variant">Wind</span>
            <span class="text-sm text-on-surface font-semibold">${wind} km/h</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <span class="material-symbols-outlined text-sm text-orange-400">light_mode</span>
            <span class="text-xs text-on-surface-variant">UV Max</span>
            <span class="text-sm text-on-surface font-semibold">${uvMax}</span>
          </div>
        </div>
        ${day.pop != null && day.pop > 0 ? `<div class="mt-3 flex items-center gap-2 text-sm text-blue-400"><span class="material-symbols-outlined text-sm">water_drop</span> ${day.pop}% chance of precipitation</div>` : ''}
        ${day.windGust != null ? `<div class="mt-2 flex items-center gap-2 text-sm text-on-surface-variant"><span class="material-symbols-outlined text-sm">air</span> Gusts up to ${Math.round(day.windGust)} km/h</div>` : ''}
      </div>
    `;
    row.after(detail);
    expandedForecastDay = index;
  }

  function updateHourlyForecast(hourly) {
    elements.hourlyForecast.innerHTML = '';
    hourly.forEach((hour, index) => {
      const date = new Date(hour.dt * 1000);
      const isNow = index === 0;
      const timeStr = isNow ? 'Now' : date.toLocaleTimeString('en-US', { hour: 'numeric' });
      const temp = convertTemp(hour.temp);
      const icon = getWeatherIconName(hour.weather?.[0]?.id);
      const item = document.createElement('div');
      item.className = `flex flex-col items-center gap-2 min-w-[72px] p-3 rounded-xl transition-all duration-200 ${isNow ? 'bg-primary/10 border border-primary/25 shadow-[0_4px_12px_rgba(0,219,231,0.15)]' : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]'}`;
      const pop = hour.pop || 0;
      item.innerHTML = `
        <span class="font-label-caps text-label-caps ${isNow ? 'text-primary' : 'text-on-surface-variant'}">${timeStr}</span>
        <span class="material-symbols-outlined text-2xl ${isNow ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}">${icon}</span>
        <span class="font-body-lg text-body-lg ${isNow ? 'text-primary-fixed-dim' : 'text-on-surface'}">${temp}°</span>
        ${pop > 0 ? `<span class="text-[10px] text-blue-400 flex items-center gap-0.5"><span class="material-symbols-outlined" style="font-size:10px">water_drop</span>${pop}%</span>` : ''}
      `;
      elements.hourlyForecast.appendChild(item);
    });
  }

  function getWeatherEmoji(code) {
    if (code >= 200 && code < 300) return '⛈️';
    if (code >= 300 && code < 400) return '🌧️';
    if (code >= 400 && code < 500) return '🌨️';
    if (code >= 500 && code < 600) return '🌧️';
    if (code >= 600 && code < 700) return '❄️';
    if (code >= 700 && code < 800) return '🌫️';
    if (code === 800) return '☀️';
    if (code === 801) return '🌤️';
    if (code === 802) return '⛅';
    if (code >= 803) return '☁️';
    return '🌤️';
  }

  function getWeatherIconName(code) {
    const iconMap = {
      200: 'thunderstorm', 201: 'thunderstorm', 202: 'thunderstorm', 210: 'bolt', 211: 'bolt', 212: 'bolt',
      300: 'rainy', 301: 'rainy', 302: 'rainy', 500: 'rainy', 501: 'rainy', 502: 'rainy',
      600: 'ac_unit', 601: 'ac_unit', 602: 'ac_unit', 700: 'foggy', 701: 'foggy', 741: 'foggy',
      800: 'clear_day', 801: 'partly_cloudy_day', 802: 'cloud', 803: 'cloud', 804: 'cloud'
    };
    return iconMap[code] || 'cloud';
  }

  // ==================== Search ====================
  async function fetchSearchSuggestions(query, container) {
    try {
      const res = await fetch(`${CONFIG.nominatimUrl}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
      const data = await res.json();
      container.innerHTML = '';
      if (data && data.length > 0) {
        data.forEach(location => {
          const city = location.address?.city || location.address?.town || location.address?.village || location.name || '';
          const country = location.address?.country || '';
          const region = [location.address?.state, country].filter(Boolean).join(', ');
          const item = document.createElement('div');
          item.className = 'suggestion-item';
          item.setAttribute('role', 'option');
          item.innerHTML = `
            <span class="material-symbols-outlined">location_on</span>
            <div><div class="suggestion-name">${city}</div><div class="suggestion-region">${region}</div></div>
          `;
          item.addEventListener('click', () => {
            const position = { coords: { latitude: parseFloat(location.lat), longitude: parseFloat(location.lon), accuracy: 100 } };
            handlePositionSuccess(position);
            container.classList.add('hidden');
            elements.searchInput.value = city;
            elements.mobileSearchInput && (elements.mobileSearchInput.value = city);
            elements.mobileSearchOverlay?.classList.add('hidden');
            // Fly globe to location
            if (appState.globeReady) {
              CesiumGlobe.flyToUserLocation(position.coords.latitude, position.coords.longitude);
            }
          });
          container.appendChild(item);
        });
        container.classList.remove('hidden');
      } else {
        container.classList.add('hidden');
      }
    } catch (error) {
      console.error('Search suggestions error:', error);
      container.classList.add('hidden');
    }
  }

  async function searchLocation(query) {
    if (!query || query.trim().length < 2) return;
    updateStatus('Searching for location...');
    try {
      const res = await fetch(`${CONFIG.nominatimUrl}/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const location = data[0];
        const position = { coords: { latitude: parseFloat(location.lat), longitude: parseFloat(location.lon), accuracy: 100 } };
        handlePositionSuccess(position);
        showToast(`Found: ${location.display_name.split(',')[0]}`, 'success');
        // Fly globe to location
        if (appState.globeReady) {
          CesiumGlobe.flyToUserLocation(position.coords.latitude, position.coords.longitude);
        }
      } else {
        showToast('Location not found. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Search error:', error);
      showToast('Location search failed.', 'error');
    }
  }

  function updateStatus(message, type = 'info') {
    elements.statusText.textContent = message;
    if (type === 'error') {
      elements.geoStatus.className = 'p-4 bg-error-container/20 border border-error/20 flex items-center gap-3';
      elements.statusIcon.textContent = 'error';
      elements.statusTitle.textContent = 'Error';
    } else {
      elements.geoStatus.className = 'p-4 bg-surface-container-low/50 flex items-center gap-3';
      elements.statusIcon.textContent = 'check_circle';
      elements.statusTitle.textContent = 'Location Acquired';
    }
  }

  // ==================== Temperature Unit ====================
  function setTemperatureUnit(unit) {
    appState.temperatureUnit = unit;
    localStorage.setItem('skylens_temp_unit', unit);
    updateTempButtons();
    const cacheKey = appState.currentPosition ? `weather_${appState.currentPosition.coords.latitude.toFixed(2)}_${appState.currentPosition.coords.longitude.toFixed(2)}` : null;
    if (cacheKey && weatherCache[cacheKey]) updateWeatherDisplay(weatherCache[cacheKey].data);
  }

  function updateTempButtons() {
    if (!elements.tempC || !elements.tempF) return;
    if (appState.temperatureUnit === 'celsius') {
      elements.tempC.classList.add('bg-primary/20', 'text-primary');
      elements.tempC.classList.remove('text-on-surface-variant');
      elements.tempF.classList.remove('bg-primary/20', 'text-primary');
      elements.tempF.classList.add('text-on-surface-variant');
    } else {
      elements.tempF.classList.add('bg-primary/20', 'text-primary');
      elements.tempF.classList.remove('text-on-surface-variant');
      elements.tempC.classList.remove('bg-primary/20', 'text-primary');
      elements.tempC.classList.add('text-on-surface-variant');
    }
  }

  // ==================== Favorites ====================
  function toggleFavorite() {
    if (!appState.location.lat || !appState.location.lon) { showToast('No location to save', 'warning'); return; }
    const existingIndex = appState.favorites.findIndex(f => Math.abs(f.lat - appState.location.lat) < 0.01 && Math.abs(f.lon - appState.location.lon) < 0.01);
    if (existingIndex >= 0) {
      appState.favorites.splice(existingIndex, 1);
      showToast('Removed from favorites', 'info');
    } else {
      appState.favorites.push({ city: appState.location.city, country: appState.location.country, lat: appState.location.lat, lon: appState.location.lon });
      showToast(`Added ${appState.location.city} to favorites`, 'success');
    }
    localStorage.setItem('skylens_favorites', JSON.stringify(appState.favorites));
    updateFavoriteButton();
    renderFavorites();
  }

  function updateFavoriteButton() {
    if (!appState.location.lat || !appState.location.lon) return;
    const isFavorited = appState.favorites.some(f => Math.abs(f.lat - appState.location.lat) < 0.01 && Math.abs(f.lon - appState.location.lon) < 0.01);
    elements.favBtn.classList.toggle('favorited', isFavorited);
    elements.favIcon.textContent = isFavorited ? 'favorite' : 'favorite_border';
  }

  function renderFavorites() {
    if (!appState.showFavorites) return;
    elements.favCount.textContent = appState.favorites.length;
    if (appState.favorites.length === 0) {
      elements.favoritesList.innerHTML = `
        <div class="text-center py-6">
          <span class="material-symbols-outlined text-on-surface-variant/30 text-3xl mb-2 block">favorite_border</span>
          <p class="text-sm text-on-surface-variant/50">No saved locations yet</p>
          <p class="text-xs text-on-surface-variant/30 mt-1">Tap the heart icon to save a location</p>
        </div>
      `;
      return;
    }
    elements.favoritesList.innerHTML = '';
    appState.favorites.forEach((fav, index) => {
      const item = document.createElement('div');
      item.className = 'favorite-item-inline';
      item.innerHTML = `
        <span class="material-symbols-outlined">favorite</span>
        <div class="flex-1"><div class="fav-name">${fav.city}</div><div class="fav-country">${fav.country}</div></div>
        <button class="fav-remove" aria-label="Remove ${fav.city} from favorites" data-index="${index}"><span class="material-symbols-outlined">close</span></button>
      `;
      item.addEventListener('click', (e) => {
        if (e.target.closest('.fav-remove')) return;
        const position = { coords: { latitude: fav.lat, longitude: fav.lon, accuracy: 100 } };
        handlePositionSuccess(position);
        appState.showFavorites = false;
        elements.favoritesPanel.classList.add('hidden');
        if (appState.globeReady) CesiumGlobe.flyToUserLocation(fav.lat, fav.lon);
      });
      item.querySelector('.fav-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        appState.favorites.splice(index, 1);
        localStorage.setItem('skylens_favorites', JSON.stringify(appState.favorites));
        updateFavoriteButton();
        renderFavorites();
        showToast(`Removed ${fav.city}`, 'info');
      });
      elements.favoritesList.appendChild(item);
    });
  }

  // ==================== Share ====================
  async function shareWeather() {
    if (!appState.weather && !appState.location.city) return;
    const city = appState.location.city || 'Unknown';
    const temp = appState.weather ? convertTemp(appState.weather.temperature) : '--';
    const condition = appState.weather?.condition?.text || '';
    const unit = appState.temperatureUnit === 'fahrenheit' ? '°F' : '°C';
    const shareText = `🌤️ Weather in ${city}: ${temp}${unit}${condition ? ' - ' + condition : ''}`;
    if (navigator.share) {
      try { await navigator.share({ title: `SkyLens Weather - ${city}`, text: shareText, url: window.location.href }); showToast('Shared successfully', 'success'); }
      catch (err) { if (err.name !== 'AbortError') fallbackShare(shareText); }
    } else { fallbackShare(shareText); }
  }

  function fallbackShare(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Weather info copied to clipboard', 'success')).catch(() => showToast('Unable to share', 'error'));
  }

  // ==================== Map (Cesium Globe) ====================
  function updateMap(position) {
    if (!appState.globeReady) return;
    const { latitude, longitude } = position.coords;
    CesiumGlobe.flyToUserLocation(latitude, longitude);
    CesiumGlobe.setMarker(latitude, longitude, appState.location.city || 'Location', '--', '', '');
  }

  // ==================== Mobile Bottom Nav ====================
  const mobileRadarBtn = document.getElementById('mobileRadarBtn');
  const mobileForecastBtn = document.getElementById('mobileForecastBtn');
  const mobileAlertsBtn = document.getElementById('mobileAlertsBtn');

  if (mobileRadarBtn) {
    mobileRadarBtn.addEventListener('click', () => {
      const globeSection = document.getElementById('globeSection');
      if (globeSection) globeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (mobileForecastBtn) {
    mobileForecastBtn.addEventListener('click', () => {
      const forecastSection = document.querySelector('#forecastItems')?.closest('section');
      if (forecastSection) forecastSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (mobileAlertsBtn) {
    mobileAlertsBtn.addEventListener('click', () => {
      showToast('Weather alerts coming soon!', 'info');
    });
  }

  // ==================== Moon Phase ====================
  function getMoonPhase(date) {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    const day = date.getDate();
    let c = 0, e = 0, jd = 0, b = 0;
    if (month < 3) { year--; month += 12; }
    ++month;
    c = 365.25 * year;
    e = 30.6 * month;
    jd = c + e + day - 694039.09;
    jd /= 29.5305882;
    b = parseInt(jd);
    jd -= b;
    b = Math.round(jd * 8);
    if (b >= 8) b = 0;
    const phases = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
    const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    return { emoji: phases[b], name: names[b] };
  }

  function updateMoonPhase() {
    const moonEl = document.getElementById('moonPhase');
    const moonNameEl = document.getElementById('moonPhaseName');
    if (moonEl && moonNameEl) {
      const phase = getMoonPhase(new Date());
      moonEl.textContent = phase.emoji;
      moonNameEl.textContent = phase.name;
    }
  }

  // Auto-update "last updated" time
  setInterval(() => {
    if (appState.lastUpdated) {
      const diff = Math.floor((Date.now() - appState.lastUpdated.getTime()) / 1000);
      let text;
      if (diff < 60) text = 'Updated just now';
      else if (diff < 3600) text = `Updated ${Math.floor(diff / 60)}m ago`;
      else text = `Updated ${Math.floor(diff / 3600)}h ago`;
      if (elements.lastUpdated) elements.lastUpdated.querySelector('span:last-child').textContent = text;
    }
  }, 30000);

  updateTempButtons();
  updateMoonPhase();

  // ==================== Weather Alerts ====================
  function updateWeatherAlerts(alertsData) {
    const section = document.getElementById('alertsSection');
    const container = document.getElementById('alertsContainer');
    if (!section || !container) return;
    // Normalize alerts from NWS or OWM format
    let alerts = [];
    if (alertsData && Array.isArray(alertsData)) {
      alerts = alertsData;
    } else if (alertsData?.features) {
      // NWS GeoJSON format
      alerts = alertsData.features.map(f => ({
        event: f.properties?.event || 'Alert',
        description: f.properties?.description || f.properties?.headline || '',
        sender_name: f.properties?.senderName || '',
        start: f.properties?.onset ? Math.floor(new Date(f.properties.onset).getTime() / 1000) : null,
        end: f.properties?.expires ? Math.floor(new Date(f.properties.expires).getTime() / 1000) : null
      }));
    }
    if (alerts.length === 0) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    container.innerHTML = '';
    alerts.forEach(alert => {
      const severity = alert.event?.toLowerCase().includes('warning') ? 'warning'
        : alert.event?.toLowerCase().includes('watch') ? 'watch'
        : alert.event?.toLowerCase().includes('advisory') ? 'advisory'
        : 'info';
      const colors = {
        warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'warning', iconColor: 'text-amber-400', label: 'bg-amber-500/20 text-amber-400' },
        watch: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: 'visibility', iconColor: 'text-orange-400', label: 'bg-orange-500/20 text-orange-400' },
        advisory: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'info', iconColor: 'text-blue-400', label: 'bg-blue-500/20 text-blue-400' },
        info: { bg: 'bg-surface-container/50', border: 'border-white/10', icon: 'notification_important', iconColor: 'text-on-surface-variant', label: 'bg-surface-container-highest text-on-surface-variant' }
      };
      const c = colors[severity];
      const card = document.createElement('div');
      card.className = `${c.bg} border ${c.border} rounded-xl p-4 mb-3 forecast-enter`;
      card.setAttribute('role', 'alert');
      card.innerHTML = `
        <div class="flex items-start gap-3">
          <span class="material-symbols-outlined ${c.iconColor} text-xl mt-0.5">${c.icon}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <h4 class="font-body-md text-body-md text-on-surface font-semibold truncate">${alert.event || 'Weather Alert'}</h4>
              <span class="text-[10px] px-2 py-0.5 rounded-full ${c.label} font-bold uppercase">${severity}</span>
            </div>
            ${alert.sender_name ? `<p class="text-xs text-on-surface-variant/70 mb-1">${alert.sender_name}</p>` : ''}
            <p class="text-sm text-on-surface-variant line-clamp-3">${alert.description || 'No details available.'}</p>
            ${alert.start && alert.end ? `<p class="text-xs text-on-surface-variant/50 mt-2">${new Date(alert.start * 1000).toLocaleString()} — ${new Date(alert.end * 1000).toLocaleString()}</p>` : ''}
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // ==================== AQI Breakdown ====================
  function setupAQIDetail() {
    const aqiCard = document.getElementById('aqiValue')?.closest('.glass-panel');
    if (!aqiCard) return;
    aqiCard.style.cursor = 'pointer';
    aqiCard.setAttribute('role', 'button');
    aqiCard.setAttribute('tabindex', '0');
    aqiCard.setAttribute('aria-label', 'View air quality details');
    const handler = () => {
      const section = document.getElementById('aqiDetailSection');
      if (section) section.classList.toggle('hidden');
    };
    aqiCard.addEventListener('click', handler);
    aqiCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
    const closeBtn = document.getElementById('aqiDetailClose');
    if (closeBtn) closeBtn.addEventListener('click', () => document.getElementById('aqiDetailSection')?.classList.add('hidden'));
  }

  function renderAQIDetail(aqiComponents) {
    if (!aqiComponents) return;
    const content = document.getElementById('aqiDetailContent');
    const advice = document.getElementById('aqiHealthAdvice');
    if (!content) return;
    const pollutants = [
      { key: 'pm2_5', label: 'PM2.5', unit: 'μg/m³', who: [0, 15, 30, 55, 110, 9999], colors: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'] },
      { key: 'pm10', label: 'PM10', unit: 'μg/m³', who: [0, 45, 90, 180, 270, 9999], colors: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'] },
      { key: 'o3', label: 'O₃', unit: 'μg/m³', who: [0, 100, 160, 215, 265, 9999], colors: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'] },
      { key: 'no2', label: 'NO₂', unit: 'μg/m³', who: [0, 100, 200, 400, 800, 9999], colors: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'] },
      { key: 'so2', label: 'SO₂', unit: 'μg/m³', who: [0, 20, 40, 350, 500, 9999], colors: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'] },
      { key: 'co', label: 'CO', unit: 'μg/m³', who: [0, 4000, 10000, 35000, 60000, 9999999], colors: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'] }
    ];
    content.innerHTML = '';
    pollutants.forEach(p => {
      const val = aqiComponents[p.key];
      if (val == null) return;
      let level = 0;
      for (let i = 1; i < p.who.length; i++) { if (val > p.who[i - 1] && val <= p.who[i]) { level = i - 1; break; } }
      if (val > p.who[4]) level = 4;
      const pct = Math.min((val / p.who[4]) * 100, 100);
      const card = document.createElement('div');
      card.className = 'bg-surface-container-low/30 rounded-lg p-3';
      card.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <span class="font-label-caps text-label-caps text-on-surface-variant">${p.label}</span>
          <span class="text-xs text-on-surface font-semibold">${val.toFixed(1)} ${p.unit}</span>
        </div>
        <div class="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500" style="width: ${pct}%; background: ${p.colors[level]};"></div>
        </div>
      `;
      content.appendChild(card);
    });
    if (advice) {
      const aqiVal = appState.weather?.aqi || 0;
      const adviceText = [
        { level: 1, icon: '✅', text: 'Air quality is satisfactory. Enjoy outdoor activities!', color: 'text-green-400' },
        { level: 2, icon: '👍', text: 'Air quality is acceptable. Unusually sensitive people should limit prolonged outdoor exertion.', color: 'text-lime-400' },
        { level: 3, icon: '⚠️', text: 'Moderate risk. Sensitive groups (children, elderly, asthmatics) should reduce prolonged outdoor exertion.', color: 'text-yellow-400' },
        { level: 4, icon: '🔴', text: 'High risk. Everyone should reduce prolonged outdoor exertion. Sensitive groups should avoid it entirely.', color: 'text-orange-400' },
        { level: 5, icon: '🚨', text: 'Very high risk. Avoid all outdoor activities. Keep windows closed. Use air purifiers if available.', color: 'text-red-400' }
      ];
      const a = adviceText[aqiVal - 1] || adviceText[0];
      advice.innerHTML = `<span class="${a.color}">${a.icon}</span> <span class="text-sm text-on-surface-variant">${a.text}</span>`;
    }
  }

  setupAQIDetail();

  // ==================== Weather Particles ====================
  function updateWeatherParticles(code) {
    const container = document.getElementById('weatherParticles');
    if (!container) return;
    container.innerHTML = '';
    let type = 'clear';
    if (code >= 200 && code < 400) type = 'storm';
    else if (code >= 300 && code < 600) type = 'rain';
    else if (code >= 600 && code < 700) type = 'snow';
    else if (code >= 700 && code < 800) type = 'fog';
    else if (code === 800 || code === 801) type = 'sun';
    else if (code >= 802) type = 'cloud';
    if (type === 'rain' || type === 'storm') {
      for (let i = 0; i < 30; i++) {
        const drop = document.createElement('div');
        drop.className = 'particle-rain';
        drop.style.left = Math.random() * 100 + '%';
        drop.style.animationDuration = (0.4 + Math.random() * 0.4) + 's';
        drop.style.animationDelay = Math.random() * 2 + 's';
        drop.style.opacity = 0.2 + Math.random() * 0.3;
        container.appendChild(drop);
      }
    } else if (type === 'snow') {
      for (let i = 0; i < 25; i++) {
        const flake = document.createElement('div');
        flake.className = 'particle-snow';
        flake.style.left = Math.random() * 100 + '%';
        flake.style.animationDuration = (3 + Math.random() * 4) + 's';
        flake.style.animationDelay = Math.random() * 3 + 's';
        flake.style.opacity = 0.3 + Math.random() * 0.4;
        flake.style.fontSize = (4 + Math.random() * 6) + 'px';
        container.appendChild(flake);
      }
    } else if (type === 'sun') {
      for (let i = 0; i < 8; i++) {
        const ray = document.createElement('div');
        ray.className = 'particle-sun';
        ray.style.top = (-10 + Math.random() * 30) + '%';
        ray.style.right = (-5 + Math.random() * 20) + '%';
        ray.style.animationDuration = (4 + Math.random() * 3) + 's';
        ray.style.animationDelay = Math.random() * 2 + 's';
        ray.style.opacity = 0.08 + Math.random() * 0.1;
        container.appendChild(ray);
      }
    } else if (type === 'cloud') {
      for (let i = 0; i < 5; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'particle-cloud';
        cloud.style.top = (5 + Math.random() * 40) + '%';
        cloud.style.left = Math.random() * 80 + '%';
        cloud.style.animationDuration = (15 + Math.random() * 20) + 's';
        cloud.style.animationDelay = Math.random() * 10 + 's';
        cloud.style.opacity = 0.05 + Math.random() * 0.08;
        cloud.style.width = (60 + Math.random() * 80) + 'px';
        cloud.style.height = (30 + Math.random() * 30) + 'px';
        container.appendChild(cloud);
      }
    }
  }


})();
