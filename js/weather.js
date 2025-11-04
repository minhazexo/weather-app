class WeatherManager {
    constructor() {
        this.weatherData = null;
        this.forecastData = null;
        this.apiKey = 'c41ac4dcbbb1459860ff8f6d9d65096c'; // 🔑 Your API key
    }

    // ✅ Fetch real weather data
    async fetchWeather(position) {
        const { latitude, longitude } = position.coords;

        try {
            // OpenWeather API URL (current weather)
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }
            
            const data = await response.json();
            this.weatherData = await this.formatWeatherData(data, latitude, longitude);

            // ✅ Fetch forecast after getting current weather
            this.forecastData = await this.fetchForecast(latitude, longitude);
            this.weatherData.forecast = this.forecastData;
            
            return this.weatherData;
        } catch (err) {
            console.error("Error fetching weather:", err);
            throw err; // Re-throw to handle in the app
        }
    }

    // ✅ Format API weather data for your UI
    async formatWeatherData(data, lat, lon) {
        // Try to get UV index from OneCall API
        let uvIndex = "N/A";
        try {
            const oneCallUrl = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${this.apiKey}`;
            const uvResponse = await fetch(oneCallUrl);
            if (uvResponse.ok) {
                const uvData = await uvResponse.json();
                uvIndex = uvData.value.toFixed(1);
            }
        } catch (error) {
            console.log("UV index not available");
        }

        return {
            temperature: Math.round(data.main.temp),
            windSpeed: (data.wind.speed * 3.6).toFixed(1), // m/s ➡ km/h
            humidity: data.main.humidity,
            uvIndex: uvIndex,
            pressure: data.main.pressure,
            condition: {
                text: data.weather[0].description,
                icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
                code: data.weather[0].id
            },
            city: data.name,
            country: data.sys.country
        };
    }

    // ✅ Fetch 5-day forecast
    async fetchForecast(lat, lon) {
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;

        try {
            const response = await fetch(forecastUrl);
            if (!response.ok) {
                throw new Error(`Forecast API error: ${response.status}`);
            }
            
            const data = await response.json();
            const dailyForecast = [];
            const processedDays = new Set();

            // Process all forecast items and get one per day
            data.list.forEach(item => {
                const date = new Date(item.dt * 1000);
                const dateString = date.toDateString(); // Use full date string for uniqueness
                
                // Take one forecast per day (the first one we encounter for each day)
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

            return dailyForecast.slice(0, 5); // ✅ Limit to 5-day forecast
        } catch (err) {
            console.error("Error fetching forecast:", err);
            return []; // Return empty array instead of throwing
        }
    }

    // ✅ Get Font Awesome icon based on weather condition code
    getWeatherIcon(conditionCode, isDay = true) {
        const iconMap = {
            // Thunderstorm
            200: 'fa-cloud-bolt', 201: 'fa-cloud-bolt', 202: 'fa-cloud-bolt',
            210: 'fa-bolt', 211: 'fa-bolt', 212: 'fa-bolt', 221: 'fa-bolt',
            230: 'fa-cloud-bolt', 231: 'fa-cloud-bolt', 232: 'fa-cloud-bolt',
            // Drizzle
            300: 'fa-cloud-rain', 301: 'fa-cloud-rain', 302: 'fa-cloud-rain',
            310: 'fa-cloud-rain', 311: 'fa-cloud-rain', 312: 'fa-cloud-rain',
            313: 'fa-cloud-rain', 314: 'fa-cloud-rain', 321: 'fa-cloud-rain',
            // Rain
            500: 'fa-cloud-sun-rain', 501: 'fa-cloud-rain', 502: 'fa-cloud-showers-heavy',
            503: 'fa-cloud-showers-heavy', 504: 'fa-cloud-showers-heavy', 511: 'fa-snowflake',
            520: 'fa-cloud-sun-rain', 521: 'fa-cloud-rain', 522: 'fa-cloud-showers-heavy',
            531: 'fa-cloud-showers-heavy',
            // Snow
            600: 'fa-snowflake', 601: 'fa-snowflake', 602: 'fa-snowflake',
            611: 'fa-sleet', 612: 'fa-sleet', 613: 'fa-sleet',
            615: 'fa-snowflake', 616: 'fa-snowflake', 620: 'fa-snowflake',
            621: 'fa-snowflake', 622: 'fa-snowflake',
            // Atmosphere
            701: 'fa-smog', 711: 'fa-smog', 721: 'fa-smog', 731: 'fa-dust',
            741: 'fa-fog', 751: 'fa-dust', 761: 'fa-dust', 762: 'fa-dust',
            771: 'fa-wind', 781: 'fa-tornado',
            // Clear
            800: isDay ? 'fa-sun' : 'fa-moon',
            // Clouds
            801: isDay ? 'fa-cloud-sun' : 'fa-cloud-moon', 
            802: 'fa-cloud', 803: 'fa-cloud', 804: 'fa-cloud'
        };
        
        return iconMap[conditionCode] || 'fa-cloud';
    }

    // ✅ Reverse Geocoding 
    async getReverseGeocoding(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();
            
            return {
                city: data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown City',
                country: data.address.country || 'Unknown Country'
            };
        } catch (error) {
            console.error("Reverse geocoding error:", error);
            return {
                city: 'Unknown City',
                country: 'Unknown Country'
            };
        }
    }

    // ✅ Search location by name
    async searchLocation(query) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
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
        } catch (error) {
            console.error("Location search error:", error);
            throw error;
        }
    }
}