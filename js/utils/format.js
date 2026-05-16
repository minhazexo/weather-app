export function formatTime(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTemperature(celsius, unit = 'celsius') {
  if (unit === 'fahrenheit') {
    return Math.round((celsius * 9/5) + 32);
  }
  return celsius;
}

export function formatCoordinates(lat, lon) {
  return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
}

export function formatWindSpeed(metersPerSecond) {
  return (metersPerSecond * 3.6).toFixed(1);
}

export function formatVisibility(meters) {
  return (meters / 1000).toFixed(1);
}

export function formatTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}