import { CONFIG } from '../config.js';
import { WeatherCache, OfflineStorage } from './cache.js';
import { formatTime } from '../utils/format.js';

export class WeatherService {
  constructor() {
    this.apiKey = CONFIG.apiKey;
    this.cache = new WeatherCache();
    this.offlineStorage = new OfflineStorage();
  }

  async fetchWithRetry(url, options = {}, retries = CONFIG.retryConfig.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        const delay = Math.min(
          CONFIG.retryConfig.initialDelay * Math.pow(2, i),
          CONFIG.retryConfig.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async fetchWeather(position) {
    const { latitude, longitude } = position.coords;
    const cacheKey = `weather_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;

    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const offlineData = this.offlineStorage.get(cacheKey);
    if (offlineData) {
      return offlineData;
    }

    try {
      const url = `${CONFIG.apiBaseUrl}/weather?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric`;
      const response = await this.fetchWithRetry(url);
      const data = await response.json();
      
      const weatherData = await this.formatWeatherData(data, latitude, longitude);
      const forecastData = await this.fetchForecast(latitude, longitude);
      weatherData.forecast = forecastData;
      
      const hourlyData = await this.fetchHourlyForecast(latitude, longitude);
      weatherData.hourly = hourlyData;

      this.cache.set(cacheKey, weatherData);
      this.offlineStorage.save(cacheKey, weatherData);

      return weatherData;
    } catch (error) {
      console.error('Error fetching weather:', error);
      throw error;
    }
  }

  async formatWeatherData(data, lat, lon) {
    let uvIndex = 'N/A';
    try {
      const uvUrl = `${CONFIG.apiBaseUrl}/uvi?lat=${lat}&lon=${lon}&appid=${this.apiKey}`;
      const uvResponse = await this.fetchWithRetry(uvUrl);
      if (uvResponse.ok) {
        const uvData = await uvResponse.json();
        uvIndex = uvData.value.toFixed(1);
      }
    } catch (error) {
      console.log('UV index not available');
    }

    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      highTemp: Math.round(data.main.temp_max),
      lowTemp: Math.round(data.main.temp_min),
      windSpeed: (data.wind.speed * 3.6).toFixed(1),
      windDirection: data.wind.deg,
      humidity: data.main.humidity,
      uvIndex: uvIndex,
      pressure: data.main.pressure,
      visibility: (data.visibility / 1000).toFixed(1),
      cloudCover: data.clouds.all,
      sunrise: formatTime(data.sys.sunrise),
      sunset: formatTime(data.sys.sunset),
      condition: {
        text: data.weather[0].description,
        icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
        code: data.weather[0].id
      },
      city: data.name,
      country: data.sys.country
    };
  }

  async fetchForecast(lat, lon) {
    const forecastUrl = `${CONFIG.apiBaseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;

    try {
      const response = await this.fetchWithRetry(forecastUrl);
      const data = await response.json();
      
      const dailyForecast = [];
      const processedDays = new Set();

      data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateString = date.toDateString();
        
        if (!processedDays.has(dateString)) {
          dailyForecast.push({
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            temperature: Math.round(item.main.temp),
            condition: {
              text: item.weather[0].description,
              icon: `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`,
              code: item.weather[0].id
            }
          });
          processedDays.add(dateString);
        }
      });

      return dailyForecast.slice(0, 5);
    } catch (error) {
      console.error('Error fetching forecast:', error);
      return [];
    }
  }

  async fetchHourlyForecast(lat, lon) {
    const forecastUrl = `${CONFIG.apiBaseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;

    try {
      const response = await this.fetchWithRetry(forecastUrl);
      const data = await response.json();
      
      const hourlyForecast = [];
      
      for (let i = 0; i < Math.min(8, data.list.length); i++) {
        const item = data.list[i];
        hourlyForecast.push({
          dt: item.dt,
          temp: item.main.temp,
          weather: item.weather,
          wind_speed: item.wind.speed
        });
      }

      return hourlyForecast;
    } catch (error) {
      console.error('Error fetching hourly forecast:', error);
      return [];
    }
  }

  getWeatherIcon(conditionCode, isDay = true) {
    const iconMap = {
      200: 'fa-cloud-bolt', 201: 'fa-cloud-bolt', 202: 'fa-cloud-bolt',
      210: 'fa-bolt', 211: 'fa-bolt', 212: 'fa-bolt', 221: 'fa-bolt',
      230: 'fa-cloud-bolt', 231: 'fa-cloud-bolt', 232: 'fa-cloud-bolt',
      300: 'fa-cloud-rain', 301: 'fa-cloud-rain', 302: 'fa-cloud-rain',
      310: 'fa-cloud-rain', 311: 'fa-cloud-rain', 312: 'fa-cloud-rain',
      313: 'fa-cloud-rain', 314: 'fa-cloud-rain', 321: 'fa-cloud-rain',
      500: 'fa-cloud-sun-rain', 501: 'fa-cloud-rain', 502: 'fa-cloud-showers-heavy',
      503: 'fa-cloud-showers-heavy', 504: 'fa-cloud-showers-heavy', 511: 'fa-snowflake',
      520: 'fa-cloud-sun-rain', 521: 'fa-cloud-rain', 522: 'fa-cloud-showers-heavy',
      531: 'fa-cloud-showers-heavy',
      600: 'fa-snowflake', 601: 'fa-snowflake', 602: 'fa-snowflake',
      611: 'fa-sleet', 612: 'fa-sleet', 613: 'fa-sleet',
      615: 'fa-snowflake', 616: 'fa-snowflake', 620: 'fa-snowflake',
      621: 'fa-snowflake', 622: 'fa-snowflake',
      701: 'fa-smog', 711: 'fa-smog', 721: 'fa-smog', 731: 'fa-dust',
      741: 'fa-fog', 751: 'fa-dust', 761: 'fa-dust', 762: 'fa-dust',
      771: 'fa-wind', 781: 'fa-tornado',
      800: isDay ? 'fa-sun' : 'fa-moon',
      801: isDay ? 'fa-cloud-sun' : 'fa-cloud-moon', 
      802: 'fa-cloud', 803: 'fa-cloud', 804: 'fa-cloud'
    };
    
    return iconMap[conditionCode] || 'fa-cloud';
  }
}