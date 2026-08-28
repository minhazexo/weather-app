export const CONFIG = {
  apiKey: 'c41ac4dcbbb1459860ff8f6d9d65096c',
  apiBaseUrl: 'https://api.openweathermap.org/data/2.5',
  openMeteoUrl: 'https://api.open-meteo.com/v1/forecast',
  cacheDuration: 10 * 60 * 1000,
  nominatimUrl: 'https://nominatim.openstreetmap.org',
  mapDefaults: {
    center: [51.505, -0.09],
    zoom: 13
  },
  geolocation: {
    highAccuracyTimeout: 10000,
    watchTimeout: 5000,
    maximumAge: 0
  },
  debounceDelay: 300,
  retryConfig: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000
  }
};

export const STORAGE_KEYS = {
  theme: 'geoweather_theme',
  favorites: 'geoweather_favorites',
  temperatureUnit: 'geoweather_temp_unit',
  lastLocation: 'geoweather_last_location'
};