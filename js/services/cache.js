import { CONFIG } from '../config.js';

export class WeatherCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const data = this.cache.get(key);
    if (data && Date.now() - data.timestamp < CONFIG.cacheDuration) {
      return data.value;
    }
    return null;
  }

  set(key, value) {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
  }

  has(key) {
    return this.get(key) !== null;
  }
}

export class OfflineStorage {
  constructor() {
    this.storageKey = 'geoweather_offline_data';
  }

  save(key, data) {
    try {
      const offlineData = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      offlineData[key] = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(offlineData));
    } catch (e) {
      console.warn('Failed to save offline data:', e);
    }
  }

  get(key) {
    try {
      const offlineData = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      const item = offlineData[key];
      if (item && Date.now() - item.timestamp < CONFIG.cacheDuration) {
        return item.data;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  clear() {
    localStorage.removeItem(this.storageKey);
  }
}