import { STORAGE_KEYS } from './config.js';

export class AppState {
  constructor() {
    this.listeners = new Map();
    this.state = {
      currentPosition: null,
      location: { city: 'Locating...', country: 'Please enable location access' },
      weather: null,
      forecast: [],
      temperatureUnit: localStorage.getItem(STORAGE_KEYS.temperatureUnit) || 'celsius',
      theme: localStorage.getItem(STORAGE_KEYS.theme) || 'dark',
      favorites: JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) || '[]'),
      isLoading: false,
      isOffline: !navigator.onLine,
      error: null,
      mapInitialized: false,
      lastUpdated: null
    };
    
    this.setupOnlineListener();
  }

  setupOnlineListener() {
    window.addEventListener('online', () => {
      this.setState({ isOffline: false });
    });
    window.addEventListener('offline', () => {
      this.setState({ isOffline: true });
    });
  }

  getState() {
    return { ...this.state };
  }

  setState(updates) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...updates };
    this.notifyListeners(prevState);
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => this.listeners.get(key).delete(callback);
  }

  notifyListeners(prevState) {
    this.listeners.forEach((callbacks, key) => {
      if (this.state[key] !== prevState[key]) {
        callbacks.forEach(cb => cb(this.state[key], prevState[key]));
      }
    });
  }

  setTemperatureUnit(unit) {
    this.state.temperatureUnit = unit;
    localStorage.setItem(STORAGE_KEYS.temperatureUnit, unit);
    this.notifyListeners(this.state);
  }

  toggleTheme() {
    const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
    this.state.theme = newTheme;
    localStorage.setItem(STORAGE_KEYS.theme, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    this.notifyListeners(this.state);
  }

  addFavorite(location) {
    if (!this.state.favorites.some(f => f.lat === location.lat && f.lon === location.lon)) {
      this.state.favorites.push(location);
      localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(this.state.favorites));
      this.notifyListeners(this.state);
    }
  }

  removeFavorite(index) {
    this.state.favorites.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(this.state.favorites));
    this.notifyListeners(this.state);
  }

  convertTemperature(celsius) {
    if (this.state.temperatureUnit === 'fahrenheit') {
      return Math.round((celsius * 9/5) + 32);
    }
    return celsius;
  }

  getTemperatureUnitSymbol() {
    return this.state.temperatureUnit === 'fahrenheit' ? '°F' : '°C';
  }
}

export const appState = new AppState();