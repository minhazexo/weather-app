class MapManager {
    constructor() {
        this.map = null;
        this.marker = null;
        this.circle = null;
        this.tileLayers = {};
        this.currentTileLayer = null;
    }

    init() {
        // Create map centered on a default location (London)
        this.map = L.map('map').setView([51.505, -0.09], 13);
        
        // Define different tile layers
        this.tileLayers = {
            standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                maxZoom: 19
            }),
            terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
                maxZoom: 17
            })
        };
        
        // Add default tile layer
        this.currentTileLayer = this.tileLayers.standard;
        this.currentTileLayer.addTo(this.map);
        
        // Create a custom marker icon
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-pin"></div><i class="fas fa-location-dot"></i>',
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        });
        
        // Create initial marker
        this.marker = L.marker([51.505, -0.09], { icon: customIcon }).addTo(this.map)
            .bindPopup('Your location will appear here')
            .openPopup();
        
        // Create initial circle (hidden until we have accuracy)
        this.circle = L.circle([51.505, -0.09], {
            color: '#e74c3c',
            fillColor: '#e74c3c',
            fillOpacity: 0.2,
            radius: 0
        }).addTo(this.map);
        
        // Set up map controls
        this.setupMapControls();
        this.setupMapTypeSelector();
    }

    update(position) {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Update marker position
        this.marker.setLatLng([latitude, longitude])
            .setPopupContent(`Your location (Accuracy: ${Math.round(accuracy)}m)`)
            .openPopup();
        
        // Update circle position and size
        this.circle.setLatLng([latitude, longitude]);
        this.circle.setRadius(accuracy);
        
        // Set map view to the new position
        this.map.setView([latitude, longitude], 15);
    }
    
    setupMapControls() {
        // Zoom in button
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.map.zoomIn();
        });
        
        // Zoom out button
        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.map.zoomOut();
        });
        
        // Reset view button
        document.getElementById('resetViewBtn').addEventListener('click', () => {
            if (this.marker && this.marker.getLatLng()) {
                this.map.setView(this.marker.getLatLng(), 13);
            } else {
                this.map.setView([51.505, -0.09], 13);
            }
        });
    }
    
    setupMapTypeSelector() {
        const mapTypeSelect = document.getElementById('mapTypeSelector');
        
        mapTypeSelect.addEventListener('change', (e) => {
            const selectedType = e.target.value;
            
            // Remove current tile layer
            if (this.currentTileLayer) {
                this.map.removeLayer(this.currentTileLayer);
            }
            
            // Add selected tile layer
            this.currentTileLayer = this.tileLayers[selectedType];
            this.currentTileLayer.addTo(this.map);
        });
    }
    
    // Methods for map controls
    zoomIn() {
        this.map.zoomIn();
    }
    
    zoomOut() {
        this.map.zoomOut();
    }
    
    resetView() {
        if (this.marker && this.marker.getLatLng()) {
            this.map.setView(this.marker.getLatLng(), 13);
        } else {
            this.map.setView([51.505, -0.09], 13);
        }
    }
    
    setMapType(type) {
        if (this.tileLayers[type]) {
            // Remove current tile layer
            if (this.currentTileLayer) {
                this.map.removeLayer(this.currentTileLayer);
            }
            
            // Add selected tile layer
            this.currentTileLayer = this.tileLayers[type];
            this.currentTileLayer.addTo(this.map);
        }
    }
}