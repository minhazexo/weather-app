import { CONFIG } from '../config.js';

export class GeocodingService {
  constructor() {
    this.nominatimUrl = CONFIG.nominatimUrl;
  }

  async reverseGeocode(lat, lon) {
    try {
      const response = await fetch(
        `${this.nominatimUrl}/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await response.json();
      
      return {
        city: data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown City',
        country: data.address.country || 'Unknown Country'
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return { city: 'Unknown City', country: 'Unknown Country' };
    }
  }

  async searchLocation(query) {
    try {
      const response = await fetch(
        `${this.nominatimUrl}/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return data.map(location => ({
          lat: parseFloat(location.lat),
          lon: parseFloat(location.lon),
          displayName: location.display_name,
          name: location.name || location.display_name.split(',')[0]
        }));
      }
      return [];
    } catch (error) {
      console.error('Location search error:', error);
      return [];
    }
  }
}

export class GeolocationService {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
  }

  getCurrentPosition(successCallback, errorCallback) {
    const options = {
      enableHighAccuracy: true,
      timeout: CONFIG.geolocation.highAccuracyTimeout,
      maximumAge: CONFIG.geolocation.maximumAge
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.currentPosition = position;
        successCallback(position);
      },
      errorCallback,
      options
    );
  }

  startWatching(successCallback, errorCallback) {
    const options = {
      enableHighAccuracy: true,
      timeout: CONFIG.geolocation.watchTimeout,
      maximumAge: CONFIG.geolocation.maximumAge
    };
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentPosition = position;
        successCallback(position);
      },
      errorCallback,
      options
    );
  }

  stopWatching() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  getErrorMessage(error) {
    switch(error.code) {
      case error.PERMISSION_DENIED:
        return 'User denied the request for geolocation.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information is unavailable.';
      case error.TIMEOUT:
        return 'The request to get user location timed out.';
      case error.UNKNOWN_ERROR:
        return 'An unknown error occurred.';
      default:
        return 'An error occurred while getting location.';
    }
  }
}