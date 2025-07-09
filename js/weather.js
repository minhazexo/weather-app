class WeatherManager {
    constructor() {
        this.weatherData = null;
        this.forecastData = null;
    }

    fetchWeather(position) {
        return new Promise((resolve) => {
            // Simulate API call delay
            setTimeout(() => {
                const weatherData = this.generateWeatherData(
                    position.coords.latitude, 
                    position.coords.longitude
                );
                this.weatherData = weatherData;
                
                // Generate forecast data
                this.forecastData = this.generateForecastData(weatherData.temperature);
                
                // Add forecast data to weather data
                weatherData.forecast = this.forecastData;
                weatherData.condition = this.getWeatherCondition(weatherData.temperature, weatherData.humidity);
                
                resolve(weatherData);
            }, 1500);
        });
    }

    generateWeatherData(lat, lon) {
        // Temperature based on latitude and season (simplified)
        const baseTemp = 20;
        const latEffect = Math.abs(lat) * 0.5;
        
        // Season effect (simplified - based on month)
        const month = new Date().getMonth();
        let seasonEffect = 0;
        if (lat > 0) {
            seasonEffect = month < 2 || month > 10 ? -10 : 
                          month > 4 && month < 8 ? 8 : 0;
        } else {
            seasonEffect = month < 2 || month > 10 ? 8 : 
                          month > 4 && month < 8 ? -10 : 0;
        }
        
        const temperature = Math.round(baseTemp - latEffect + seasonEffect + (Math.random() * 4 - 2));
        
        return {
            temperature: temperature,
            windSpeed: (Math.random() * 15 + 2).toFixed(1),
            humidity: Math.floor(Math.random() * 40 + 40),
            uvIndex: Math.floor(Math.random() * 6 + 1),
            pressure: Math.floor(Math.random() * 20 + 1000)
        };
    }
    
    getWeatherCondition(temperature, humidity) {
        // Determine weather condition based on temperature and humidity
        if (temperature < 0) {
            return { text: 'Snowy', icon: 'fa-snowflake' };
        } else if (temperature < 10) {
            if (humidity > 70) {
                return { text: 'Cold Rain', icon: 'fa-cloud-rain' };
            } else {
                return { text: 'Cold', icon: 'fa-cloud' };
            }
        } else if (temperature < 20) {
            if (humidity > 70) {
                return { text: 'Rainy', icon: 'fa-cloud-showers-heavy' };
            } else if (humidity > 50) {
                return { text: 'Partly Cloudy', icon: 'fa-cloud-sun' };
            } else {
                return { text: 'Mild', icon: 'fa-sun' };
            }
        } else if (temperature < 30) {
            if (humidity > 60) {
                return { text: 'Humid', icon: 'fa-cloud-sun' };
            } else {
                return { text: 'Sunny', icon: 'fa-sun' };
            }
        } else {
            if (humidity > 60) {
                return { text: 'Hot & Humid', icon: 'fa-temperature-high' };
            } else {
                return { text: 'Hot', icon: 'fa-temperature-high' };
            }
        }
    }
    
    generateForecastData(currentTemp) {
        const forecast = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date().getDay();
        
        // Generate 5-day forecast
        for (let i = 1; i <= 5; i++) {
            const dayIndex = (today + i) % 7;
            const tempVariation = Math.floor(Math.random() * 10) - 5; // -5 to +5 degrees variation
            const forecastTemp = currentTemp + tempVariation;
            
            const condition = this.getWeatherCondition(forecastTemp, Math.floor(Math.random() * 40 + 40));
            
            forecast.push({
                day: days[dayIndex],
                temperature: forecastTemp,
                condition: condition
            });
        }
        
        return forecast;
    }

    getReverseGeocoding(lat, lon) {
        return fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
            .then(response => response.json())
            .then(data => {
                return {
                    city: data.address.city || data.address.town || data.address.village || 'Unknown City',
                    country: data.address.country || 'Unknown Country'
                };
            })
            .catch(() => {
                return {
                    city: 'Unknown City',
                    country: 'Unknown Country'
                };
            });
    }
    
    searchLocation(query) {
        return fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const location = data[0];
                    return {
                        latitude: parseFloat(location.lat),
                        longitude: parseFloat(location.lon),
                        display_name: location.display_name
                    };
                } else {
                    throw new Error('Location not found');
                }
            });
    }
}