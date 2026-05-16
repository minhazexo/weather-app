import { CONFIG } from '../config.js';

export class MapComponent {
  constructor() {
    this.map = null;
    this.marker = null;
    this.circle = null;
    this.tileLayers = {};
    this.currentTileLayer = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    if (typeof L === 'undefined') {
      console.warn('Leaflet not loaded yet');
      return;
    }

    this.map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView(CONFIG.mapDefaults.center, CONFIG.mapDefaults.zoom);

    this.setupTileLayers();
    this.setupMarkers();
    this.setupControls();
    this.setupMapTypeSelector();
    
    this.initialized = true;
  }

  setupTileLayers() {
    this.tileLayers = {
      standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
      }),
      terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; OpenStreetMap contributors',
        maxZoom: 17
      })
    };

    this.currentTileLayer = this.tileLayers.standard;
    this.currentTileLayer.addTo(this.map);
  }

  setupMarkers() {
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: '<span class="material-symbols-outlined text-primary-fixed-dim" style="font-size: 32px;">location_on</span>',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    this.marker = L.marker(CONFIG.mapDefaults.center, { icon: customIcon })
      .addTo(this.map)
      .bindPopup('Your location will appear here')
      .openPopup();

    this.circle = L.circle(CONFIG.mapDefaults.center, {
      color: '#00dbe7',
      fillColor: '#00dbe7',
      fillOpacity: 0.1,
      radius: 0
    }).addTo(this.map);
  }

  setupControls() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetViewBtn = document.getElementById('resetViewBtn');

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => this.zoomIn());
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => this.zoomOut());
    }
    if (resetViewBtn) {
      resetViewBtn.addEventListener('click', () => this.resetView());
    }
  }

  setupMapTypeSelector() {
    const mapTypeSelect = document.getElementById('mapTypeSelector');
    if (mapTypeSelect) {
      mapTypeSelect.addEventListener('change', (e) => {
        this.setMapType(e.target.value);
      });
    }
  }

  update(position) {
    if (!this.initialized) {
      this.init();
    }

    const { latitude, longitude, accuracy } = position.coords;
    
    this.marker.setLatLng([latitude, longitude])
      .setPopupContent(`Your location (Accuracy: ${Math.round(accuracy)}m)`)
      .openPopup();

    if (this.circle) {
      this.circle.setLatLng([latitude, longitude]);
      this.circle.setRadius(accuracy);
    }

    this.map.setView([latitude, longitude], 15);
  }

  zoomIn() {
    this.map?.zoomIn();
  }

  zoomOut() {
    this.map?.zoomOut();
  }

  resetView() {
    if (this.marker?.getLatLng()) {
      this.map.setView(this.marker.getLatLng(), 13);
    } else {
      this.map.setView(CONFIG.mapDefaults.center, CONFIG.mapDefaults.zoom);
    }
  }

  setMapType(type) {
    if (this.tileLayers[type] && this.map) {
      if (this.currentTileLayer) {
        this.map.removeLayer(this.currentTileLayer);
      }
      this.currentTileLayer = this.tileLayers[type];
      this.currentTileLayer.addTo(this.map);
    }
  }

  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.initialized = false;
    }
  }
}

export function createLazyMapLoader(mapComponent) {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      mapComponent.init();
      observer.disconnect();
    }
  }, { rootMargin: '100px' });

  const mapElement = document.querySelector('#map');
  if (mapElement) {
    observer.observe(mapElement);
  }

  return observer;
}