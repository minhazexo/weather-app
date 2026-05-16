// SkyLens Weather Dashboard - Non-Module Version
// Works with file:// protocol

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiKey: 'c41ac4dcbbb1459860ff8f6d9d65096c',
    apiBaseUrl: 'https://api.openweathermap.org/data/2.5',
    nominatimUrl: 'https://nominatim.openstreetmap.org',
    debounceDelay: 300
  };

  // State
  let appState = {
    currentPosition: null,
    location: { city: 'Locating...', country: 'Please enable location' },
    weather: null,
    forecast: [],
    hourly: [],
    temperatureUnit: localStorage.getItem('geoweather_temp_unit') || 'celsius',
    isOffline: !navigator.onLine
  };

  // Cache
  const weatherCache = {};
  const offlineStorage = {};

  // DOM Elements
  const elements = {};

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initElements();
    bindEvents();
    setupOnlineListener();
    
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
    elements.highTemp = document.getElementById('highTemp');
    elements.lowTemp = document.getElementById('lowTemp');
    elements.tempUnit = document.getElementById('tempUnit');
    elements.windSpeed = document.getElementById('windSpeed');
    elements.humidity = document.getElementById('humidity');
    elements.uvIndex = document.getElementById('uvIndex');
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
    elements.mapTypeSelector = document.getElementById('mapTypeSelector');
    elements.offlineBanner = document.getElementById('offlineBanner');
    elements.tempC = document.getElementById('tempC');
    elements.tempF = document.getElementById('tempF');
    elements.windDirection = document.getElementById('windDirection');
    elements.windDirText = document.getElementById('windDirText');
  }

  function bindEvents() {
    elements.refreshBtn?.addEventListener('click', getCurrentPosition);
    elements.locateBtn.addEventListener('click', getCurrentPosition);
    
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      if (query.length >= 2) {
        searchTimeout = setTimeout(() => searchLocation(query), CONFIG.debounceDelay);
      }
    });
    elements.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        searchLocation(e.target.value);
      }
    });

    elements.tempC.addEventListener('click', () => setTemperatureUnit('celsius'));
    elements.tempF.addEventListener('click', () => setTemperatureUnit('fahrenheit'));

    elements.mapTypeSelector.addEventListener('change', (e) => {
      if (window.mapComponent) {
        window.mapComponent.setMapType(e.target.value);
      }
    });

    // Initialize map when visible
    initMapOnVisible();
  }

  function setupOnlineListener() {
    window.addEventListener('online', () => {
      appState.isOffline = false;
      elements.offlineBanner.classList.add('hidden');
    });
    window.addEventListener('offline', () => {
      appState.isOffline = true;
      elements.offlineBanner.classList.remove('hidden');
    });
  }

  // Geolocation
  function getCurrentPosition() {
    updateStatus('Requesting location...');
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
        message = 'User denied the request for geolocation.';
        elements.permissionPrompt.classList.remove('hidden');
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information is unavailable.';
        break;
      case error.TIMEOUT:
        message = 'The request to get user location timed out.';
        break;
      default:
        message = 'An unknown error occurred.';
    }
    updateStatus(message, 'error');
  }

  function updateLocationInfo(position) {
    const { latitude, longitude } = position.coords;
    elements.latitude.textContent = latitude.toFixed(4);
    elements.longitude.textContent = longitude.toFixed(4);

    // Reverse geocode
    fetch(`${CONFIG.nominatimUrl}/reverse?format=json&lat=${latitude}&lon=${longitude}`)
      .then(res => res.json())
      .then(data => {
        const city = data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown City';
        const country = data.address.country || 'Unknown Country';
        appState.location = { city, country };
        elements.city.textContent = city;
        elements.country.textContent = country;
        elements.headerCity.textContent = `${city}, ${country}`;
      })
      .catch(err => {
        console.error('Reverse geocode error:', err);
      });
  }

  // Weather API
  async function fetchWeather(position) {
    const { latitude, longitude } = position.coords;
    const cacheKey = `weather_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;

    // Check cache
    if (weatherCache[cacheKey]) {
      updateWeatherDisplay(weatherCache[cacheKey]);
      return;
    }

    // Show loading
    elements.weatherDisplay.classList.add('hidden');
    elements.weatherLoading.classList.remove('hidden');

    try {
      // Current weather
      const weatherRes = await fetch(
        `${CONFIG.apiBaseUrl}/weather?lat=${latitude}&lon=${longitude}&appid=${CONFIG.apiKey}&units=metric`
      );
      const weatherData = await weatherRes.json();

      // Forecast
      const forecastRes = await fetch(
        `${CONFIG.apiBaseUrl}/forecast?lat=${latitude}&lon=${longitude}&appid=${CONFIG.apiKey}&units=metric`
      );
      const forecastData = await forecastRes.json();

      const weatherResult = formatWeatherData(weatherData, forecastData);
      weatherCache[cacheKey] = weatherResult;
      
      updateWeatherDisplay(weatherResult);
    } catch (error) {
      console.error('Error fetching weather:', error);
      updateStatus('Failed to load weather data', 'error');
      elements.weatherLoading.innerHTML = `
        <span class="material-symbols-outlined text-error text-4xl">error</span>
        <p class="font-body-md text-body-md text-on-surface-variant mt-4">Failed to load weather data</p>
      `;
    }
  }

  function formatWeatherData(data, forecastData) {
    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      highTemp: Math.round(data.main.temp_max),
      lowTemp: Math.round(data.main.temp_min),
      windSpeed: (data.wind.speed * 3.6).toFixed(1),
      windDirection: data.wind.deg,
      humidity: data.main.humidity,
      uvIndex: 'N/A',
      pressure: data.main.pressure,
      visibility: (data.visibility / 1000).toFixed(1),
      cloudCover: data.clouds.all,
      sunrise: formatTime(data.sys.sunrise),
      sunset: formatTime(data.sys.sunset),
      condition: {
        text: data.weather[0].description,
        code: data.weather[0].id
      },
      city: data.name,
      country: data.sys.country,
      hourly: forecastData.list.slice(0, 8).map(item => ({
        dt: item.dt,
        temp: item.main.temp,
        weather: item.weather
      })),
      forecast: processForecast(forecastData.list)
    };
  }

  function processForecast(list) {
    const daily = [];
    const processed = new Set();
    
    list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateString = date.toDateString();
      
      if (!processed.has(dateString)) {
        daily.push({
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          temp: Math.round(item.main.temp),
          low: Math.round(item.main.temp_min),
          high: Math.round(item.main.temp_max),
          code: item.weather[0].id
        });
        processed.add(dateString);
      }
    });
    
    return daily.slice(0, 5);
  }

  function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  function updateWeatherDisplay(data) {
    const unit = appState.temperatureUnit;
    const symbol = unit === 'fahrenheit' ? '°F' : '°C';
    const unitText = unit === 'fahrenheit' ? 'F' : 'C';
    
    elements.temperature.textContent = convertTemp(data.temperature);
    elements.feelsLike.textContent = convertTemp(data.feelsLike);
    elements.highTemp.textContent = convertTemp(data.highTemp);
    elements.lowTemp.textContent = convertTemp(data.lowTemp);
    elements.tempUnit.textContent = unitText;

    elements.windSpeed.textContent = data.windSpeed;
    elements.humidity.textContent = data.humidity;
    elements.uvIndex.textContent = data.uvIndex;
    elements.pressure.textContent = data.pressure;
    elements.visibility.textContent = data.visibility;
    elements.cloudCover.textContent = data.cloudCover;
    elements.sunrise.textContent = data.sunrise;
    elements.sunset.textContent = data.sunset;

    elements.headerCity.textContent = `${data.city}, ${data.country || ''}`;
    elements.weatherConditionText.textContent = data.condition.text;
    updateWeatherIcon(data.condition.code);

    updateWindDirection(data.windDirection);
    updateForecast(data.forecast);
    updateHourlyForecast(data.hourly);
    
    elements.weatherLoading.classList.add('hidden');
    elements.weatherDisplay.classList.remove('hidden');
  }

  function convertTemp(celsius) {
    if (appState.temperatureUnit === 'fahrenheit') {
      return Math.round((celsius * 9/5) + 32);
    }
    return celsius;
  }

  function updateWeatherIcon(code) {
    const iconMap = {
      200: 'thunderstorm', 201: 'thunderstorm', 202: 'thunderstorm',
      210: 'bolt', 211: 'bolt', 212: 'bolt',
      300: 'rainy', 301: 'rainy', 302: 'rainy',
      310: 'rainy', 311: 'rainy', 312: 'rainy',
      500: 'rainy', 501: 'rainy', 502: 'rainy',
      503: 'rainy', 504: 'rainy', 511: 'ac_unit',
      600: 'ac_unit', 601: 'ac_unit', 602: 'ac_unit',
      700: 'foggy', 701: 'foggy', 741: 'foggy',
      800: 'clear_day',
      801: 'partly_cloudy_day', 
      802: 'cloud', 803: 'cloud', 804: 'cloud'
    };
    const icon = iconMap[code] || 'cloud';
    elements.weatherIcon.textContent = icon;
    elements.weatherIcon.classList.remove('hidden');
  }

  function updateWindDirection(deg) {
    if (deg !== undefined) {
      elements.windDirection.style.transform = `rotate(${deg}deg)`;
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const index = Math.round(deg / 45) % 8;
      elements.windDirText.textContent = directions[index];
    }
  }

  function updateForecast(forecast) {
    elements.forecastItems.innerHTML = '';
    
    forecast.forEach((day, index) => {
      const dayName = index === 0 ? 'Today' : day.day;
      const icon = getWeatherIconName(day.code);
      
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between py-2 border-b border-white/5';
      item.innerHTML = `
        <span class="font-body-md text-body-md ${index === 0 ? 'text-primary' : 'text-on-surface-variant'} w-12">${dayName}</span>
        <div class="flex items-center gap-2 flex-1 justify-center">
          <span class="material-symbols-outlined ${index === 0 ? 'text-primary-fixed-dim' : 'text-on-surface'}">${icon}</span>
        </div>
        <div class="flex items-center gap-3 w-20 justify-end">
          <span class="font-body-md text-body-md text-on-surface-variant">${day.low || convertTemp(day.temp - 5)}°</span>
          <span class="font-body-md text-body-md text-on-surface">${day.high || convertTemp(day.temp + 5)}°</span>
        </div>
      `;
      elements.forecastItems.appendChild(item);
    });
  }

  function updateHourlyForecast(hourly) {
    elements.hourlyForecast.innerHTML = '';
    
    hourly.forEach((hour, index) => {
      const date = new Date(hour.dt * 1000);
      const isNow = index === 0;
      const timeStr = isNow ? 'Now' : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const temp = convertTemp(hour.temp);
      const icon = getWeatherIconName(hour.weather?.[0]?.id);
      
      const item = document.createElement('div');
      item.className = `flex flex-col items-center gap-3 min-w-[70px] p-3 rounded-lg ${isNow ? 'bg-surface-container-highest border border-primary/30 shadow-[0_4px_12px_rgba(0,219,231,0.1)]' : 'bg-surface-container-low/50 border border-white/5'}`;
      item.innerHTML = `
        <span class="font-label-caps text-label-caps ${isNow ? 'text-primary' : 'text-on-surface-variant'}">${timeStr}</span>
        <span class="material-symbols-outlined ${isNow ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}">${icon}</span>
        <span class="font-body-lg text-body-lg ${isNow ? 'text-primary-fixed-dim' : ''}">${temp}°</span>
      `;
      elements.hourlyForecast.appendChild(item);
    });
  }

  function getWeatherIconName(code) {
    const iconMap = {
      200: 'thunderstorm', 201: 'thunderstorm', 202: 'thunderstorm',
      210: 'bolt', 211: 'bolt', 212: 'bolt',
      300: 'rainy', 301: 'rainy', 302: 'rainy',
      500: 'rainy', 501: 'rainy', 502: 'rainy',
      600: 'ac_unit', 601: 'ac_unit', 602: 'ac_unit',
      700: 'foggy', 701: 'foggy', 741: 'foggy',
      800: 'clear_day',
      801: 'partly_cloudy_day', 
      802: 'cloud', 803: 'cloud', 804: 'cloud'
    };
    return iconMap[code] || 'cloud';
  }

  // Search
  async function searchLocation(query) {
    if (!query || query.trim().length < 2) return;
    
    updateStatus('Searching for location...');
    
    try {
      const res = await fetch(
        `${CONFIG.nominatimUrl}/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await res.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        const position = {
          coords: {
            latitude: parseFloat(location.lat),
            longitude: parseFloat(location.lon),
            accuracy: 100
          }
        };
        handlePositionSuccess(position);
        updateStatus(`Found: ${location.display_name}`);
      } else {
        updateStatus('Location not found. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Search error:', error);
      updateStatus('Location search failed.', 'error');
    }
  }

  function updateStatus(message, type = 'info') {
    elements.statusText.textContent = message;
    
    if (type === 'error') {
      elements.geoStatus.className = 'mt-4 p-4 rounded-xl bg-error-container/20 border border-error/20 flex items-center gap-3';
      elements.statusIcon.textContent = 'error';
      elements.statusTitle.textContent = 'Error';
    } else {
      elements.geoStatus.className = 'mt-4 p-4 rounded-xl bg-surface-container-low/50 flex items-center gap-3';
      elements.statusIcon.textContent = 'check_circle';
      elements.statusTitle.textContent = 'Location Acquired';
    }
  }

  function setTemperatureUnit(unit) {
    appState.temperatureUnit = unit;
    localStorage.setItem('geoweather_temp_unit', unit);
    updateTempButtons();
    if (appState.weather) {
      updateWeatherDisplay(appState.weather);
    }
  }

  function updateTempButtons() {
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

  // Map
  let mapComponent = null;

  function initMapOnVisible() {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        initMap();
        observer.disconnect();
      }
    }, { rootMargin: '100px' });

    const mapElement = document.getElementById('map');
    if (mapElement) {
      observer.observe(mapElement);
    }
  }

  function initMap() {
    if (typeof L === 'undefined') {
      console.warn('Leaflet not loaded');
      return;
    }

    mapComponent = {
      map: L.map('map', {
        zoomControl: false,
        attributionControl: true
      }).setView([51.505, -0.09], 13),
      
      tileLayers: {
        standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 19
        }),
        terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: 'Map data: &copy; OpenStreetMap',
          maxZoom: 17
        })
      },
      
      currentLayer: null,
      
      init: function() {
        this.currentLayer = this.tileLayers.standard;
        this.currentLayer.addTo(this.map);
        
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: '<span class="material-symbols-outlined text-primary-fixed-dim" style="font-size: 32px;">location_on</span>',
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        });
        
        this.marker = L.marker([51.505, -0.09], { icon: customIcon })
          .addTo(this.map)
          .bindPopup('Your location')
          .openPopup();
      },
      
      update: function(position) {
        const { latitude, longitude } = position.coords;
        this.marker.setLatLng([latitude, longitude])
          .setPopupContent('Your location')
          .openPopup();
        this.map.setView([latitude, longitude], 15);
      },
      
      setMapType: function(type) {
        if (this.tileLayers[type] && this.map) {
          if (this.currentLayer) {
            this.map.removeLayer(this.currentLayer);
          }
          this.currentLayer = this.tileLayers[type];
          this.currentLayer.addTo(this.map);
        }
      }
    };

    mapComponent.init();
    window.mapComponent = mapComponent;
  }

  function updateMap(position) {
    if (mapComponent) {
      mapComponent.update(position);
    }
  }

  // Initialize temperature buttons
  updateTempButtons();

})();