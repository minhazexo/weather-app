class GeoWeatherApp {
    constructor() {
        this.mapManager = new MapManager();
        this.geolocationManager = new GeolocationManager();
        this.weatherManager = new WeatherManager();
        
        // DOM Elements
        this.elements = {
            city: document.getElementById('city'),
            country: document.getElementById('country'),
            latitude: document.getElementById('latitude'),
            longitude: document.getElementById('longitude'),
            accuracyValue: document.getElementById('accuracyValue'),
            accuracyDisplay: document.getElementById('accuracyDisplay'),
            permissionPrompt: document.getElementById('permissionPrompt'),
            statusText: document.getElementById('statusText'),
            geoStatus: document.getElementById('geoStatus'),
            temperature: document.getElementById('temperature'),
            windSpeed: document.getElementById('windSpeed'),
            humidity: document.getElementById('humidity'),
            uvIndex: document.getElementById('uvIndex'),
            pressure: document.getElementById('pressure'),
            weatherDisplay: document.getElementById('weatherDisplay'),
            weatherLoading: document.getElementById('weatherLoading'),
            refreshBtn: document.getElementById('refreshBtn'),
            locateBtn: document.getElementById('locateBtn'),
            searchInput: document.getElementById('searchInput'),
            weatherConditionIcon: document.getElementById('weatherConditionIcon'),
            weatherConditionText: document.getElementById('weatherConditionText'),
            forecastPreview: document.getElementById('forecastPreview'),
            mapTypeSelector: document.getElementById('mapTypeSelector'),
            zoomInBtn: document.getElementById('zoomInBtn'),
            zoomOutBtn: document.getElementById('zoomOutBtn'),
            resetViewBtn: document.getElementById('resetViewBtn')
        };
    }

    init() {
        // Initialize map
        this.mapManager.init();
        
        // Set up button event listeners
        this.elements.refreshBtn.addEventListener('click', () => this.getCurrentPosition());
        this.elements.locateBtn.addEventListener('click', () => this.startWatchingPosition());
        
        // Set up search functionality
        this.elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchLocation(this.elements.searchInput.value);
            }
        });
        
        // Set up map controls
        this.elements.mapTypeSelector.addEventListener('change', (e) => {
            this.mapManager.setMapType(e.target.value);
        });
        
        this.elements.zoomInBtn.addEventListener('click', () => {
            this.mapManager.zoomIn();
        });
        
        this.elements.zoomOutBtn.addEventListener('click', () => {
            this.mapManager.zoomOut();
        });
        
        this.elements.resetViewBtn.addEventListener('click', () => {
            this.mapManager.resetView();
        });
        
        // Try to get position on load
        if (navigator.geolocation) {
            this.getCurrentPosition();
        } else {
            this.updateStatus('Geolocation is not supported by this browser.', 'error');
        }
    }

    getCurrentPosition() {
        this.updateStatus('Requesting location...');
        
        this.geolocationManager.getCurrentPosition(
            (position) => this.handlePositionSuccess(position),
            (error) => this.handlePositionError(error)
        );
    }

    startWatchingPosition() {
        this.updateStatus('Starting continuous location tracking...');
        this.geolocationManager.startWatching(
            (position) => this.handlePositionSuccess(position),
            (error) => this.handlePositionError(error)
        );
    }

    handlePositionSuccess(position) {
        // Update location info
        this.updateLocationInfo(position);
        
        // Update map
        this.mapManager.update(position);
        
        // Update weather
        this.updateWeather(position);
        
        // Update status
        this.updateStatus('Location acquired successfully');
        this.elements.permissionPrompt.style.display = 'none';
    }

    handlePositionError(error) {
        const errorMessage = this.geolocationManager.getErrorMessage(error);
        this.updateStatus(errorMessage, 'error');
        
        if (error.code === error.PERMISSION_DENIED) {
            this.elements.permissionPrompt.style.display = 'block';
        }
    }

    updateLocationInfo(position) {
        const { latitude, longitude, accuracy } = position.coords;
        
        this.elements.latitude.textContent = latitude.toFixed(4);
        this.elements.longitude.textContent = longitude.toFixed(4);
        this.elements.accuracyValue.textContent = Math.round(accuracy);
        
        // Update accuracy display styling
        if (accuracy < 50) {
            this.elements.accuracyDisplay.className = 'accuracy-display high';
        } else if (accuracy < 200) {
            this.elements.accuracyDisplay.className = 'accuracy-display medium';
        } else {
            this.elements.accuracyDisplay.className = 'accuracy-display';
        }
        
        // Get city and country names
        this.weatherManager.getReverseGeocoding(latitude, longitude)
            .then(location => {
                this.elements.city.textContent = location.city;
                this.elements.country.textContent = location.country;
            });
    }

    async updateWeather(position) {
        // Show loading indicator
        this.elements.weatherDisplay.style.display = 'none';
        this.elements.weatherLoading.style.display = 'block';
        
        try {
            const weatherData = await this.weatherManager.fetchWeather(position);
            
            // Update DOM with weather data
            this.elements.temperature.textContent = weatherData.temperature;
            this.elements.windSpeed.textContent = weatherData.windSpeed;
            this.elements.humidity.textContent = weatherData.humidity;
            this.elements.uvIndex.textContent = weatherData.uvIndex;
            this.elements.pressure.textContent = weatherData.pressure;
            
            // Update weather condition
            if (weatherData.condition) {
                this.elements.weatherConditionIcon.className = `fas ${weatherData.condition.icon}`;
                this.elements.weatherConditionText.textContent = weatherData.condition.text;
            }
            
            // Update forecast
            if (weatherData.forecast && weatherData.forecast.length > 0) {
                this.updateForecast(weatherData.forecast);
            }
            
            // Hide loading, show weather
            this.elements.weatherLoading.style.display = 'none';
            this.elements.weatherDisplay.style.display = 'block';
        } catch (error) {
            console.error('Error fetching weather:', error);
            this.updateStatus('Failed to load weather data', 'error');
        }
    }
    
    updateForecast(forecastData) {
        // Clear previous forecast
        this.elements.forecastPreview.innerHTML = '<h3>5-Day Forecast</h3>';
        
        // Create forecast items container
        const forecastItems = document.createElement('div');
        forecastItems.className = 'forecast-items';
        
        // Add forecast items
        forecastData.forEach(day => {
            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            
            forecastItem.innerHTML = `
                <div class="forecast-day">${day.day}</div>
                <div class="forecast-icon"><i class="fas ${day.condition.icon}"></i></div>
                <div class="forecast-temp">${day.temperature}°</div>
            `;
            
            forecastItems.appendChild(forecastItem);
        });
        
        this.elements.forecastPreview.appendChild(forecastItems);
    }
    
    async searchLocation(query) {
        if (!query || query.trim() === '') return;
        
        this.updateStatus('Searching for location...');
        
        try {
            const locationData = await this.weatherManager.searchLocation(query);
            
            // Create a position-like object to use with existing methods
            const position = {
                coords: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    accuracy: 100 // Default accuracy since we don't have real accuracy data
                }
            };
            
            // Update the map and weather with the new location
            this.handlePositionSuccess(position);
            
            // Update status
            this.updateStatus(`Found location: ${locationData.display_name}`);
            
            // Clear search input
            this.elements.searchInput.value = '';
        } catch (error) {
            console.error('Error searching location:', error);
            this.updateStatus('Location not found. Please try again.', 'error');
        }
    }

    updateStatus(message, type = 'info') {
        this.elements.statusText.textContent = message;
        
        if (type === 'error') {
            this.elements.geoStatus.className = 'status error';
            this.elements.geoStatus.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <div class="status-text">
                    <h3>Geolocation Error</h3>
                    <p>${message}</p>
                </div>
            `;
        } else {
            this.elements.geoStatus.className = 'status';
            this.elements.geoStatus.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <div class="status-text">
                    <h3>Location Acquired</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new GeoWeatherApp();
    app.init();
});