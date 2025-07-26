class WeatherManager {
    constructor() {
        this.weatherData = null;
        this.forecastData = null;
        this.apiKey = "c41ac4dcbbb1459860ff8f6d9d65096c"; // 🔑 Add your API key here
    }

    // ✅ Fetch real weather data
    fetchWeather(position) {
        const { latitude, longitude } = position.coords;

        // OpenWeather API URL (current weather)
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric`;

        return fetch(url)
            .then(response => response.json())
            .then(data => {
                this.weatherData = this.formatWeatherData(data);

                // ✅ Fetch forecast after getting current weather
                return this.fetchForecast(latitude, longitude).then(forecast => {
                    this.forecastData = forecast;
                    this.weatherData.forecast = forecast;
                    return this.weatherData;
                });
            })
            .catch(err => {
                console.error("Error fetching weather:", err);
                return null;
            });
    }

    // ✅ Format API weather data for your UI
    formatWeatherData(data) {
        return {
            temperature: Math.round(data.main.temp),
            windSpeed: (data.wind.speed * 3.6).toFixed(1), // m/s ➡ km/h
            humidity: data.main.humidity,
            uvIndex: "N/A", // OpenWeather requires OneCall API for UV Index (optional)
            pressure: data.main.pressure,
            condition: {
                text: data.weather[0].description,
                icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
            },
            city: data.name,
            country: data.sys.country
        };
    }

    // ✅ Fetch 5-day forecast (3-hour intervals)
    fetchForecast(lat, lon) {
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;

        return fetch(forecastUrl)
            .then(response => response.json())
            .then(data => {
                const dailyForecast = [];
                const daysAdded = new Set();

                data.list.forEach(item => {
                    const date = new Date(item.dt * 1000);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                    // Pick only one forecast per day (midday)
                    if (!daysAdded.has(dayName) && date.getHours() === 12) {
                        dailyForecast.push({
                            day: dayName,
                            temperature: Math.round(item.main.temp),
                            condition: {
                                text: item.weather[0].description,
                                icon: `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`
                            }
                        });
                        daysAdded.add(dayName);
                    }
                });

                return dailyForecast.slice(0, 5); // ✅ Limit to 5-day forecast
            })
            .catch(err => {
                console.error("Error fetching forecast:", err);
                return [];
            });
    }

    // ✅ Reverse Geocoding (keep your existing method)
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

    // ✅ Search location by name (keep this)
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
