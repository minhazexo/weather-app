export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>"'&]/g, '').trim();
}

export function validateCoordinates(lat, lon) {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180
  );
}

export function validateLocationName(name) {
  const sanitized = sanitizeInput(name);
  return sanitized.length >= 2 && sanitized.length <= 100;
}

export function isValidTemperature(temp) {
  return typeof temp === 'number' && temp >= -100 && temp <= 60;
}

export function rateLimiter(fn, delay) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn(...args);
    }
    return null;
  };
}

export function validateGeolocationError(error) {
  return error && typeof error.code === 'number';
}