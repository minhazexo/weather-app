class GeolocationManager {
    constructor() {
        this.watchId = null;
        this.currentPosition = null;
    }

    getCurrentPosition(successCallback, errorCallback) {
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
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
            timeout: 5000,
            maximumAge: 0
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