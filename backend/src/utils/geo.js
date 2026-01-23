/**
 * Utilidades de geolocalización
 */

/**
 * Calcula la distancia entre dos puntos usando la fórmula de Haversine
 * @param {number} lat1 - Latitud punto 1
 * @param {number} lon1 - Longitud punto 1
 * @param {number} lat2 - Latitud punto 2
 * @param {number} lon2 - Longitud punto 2
 * @returns {number} Distancia en metros
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
};

/**
 * Verifica si una ubicación está dentro del radio de una obra
 * @param {Object} userLocation - { latitude, longitude }
 * @param {Object} worksite - { latitude, longitude, radiusMeters }
 * @returns {Object} { isWithin, distance }
 */
const isWithinGeofence = (userLocation, worksite) => {
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    worksite.latitude,
    worksite.longitude
  );

  return {
    isWithin: distance <= worksite.radiusMeters,
    distance: Math.round(distance), // Redondeado a metros
  };
};

/**
 * Encuentra la obra más cercana de una lista
 * @param {Object} userLocation - { latitude, longitude }
 * @param {Array} worksites - Lista de obras
 * @returns {Object|null} Obra más cercana con distancia
 */
const findNearestWorksite = (userLocation, worksites) => {
  if (!worksites || worksites.length === 0) return null;

  let nearest = null;
  let minDistance = Infinity;

  for (const worksite of worksites) {
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      worksite.latitude,
      worksite.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = {
        ...worksite,
        distance: Math.round(distance),
      };
    }
  }

  return nearest;
};

/**
 * Valida coordenadas
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {boolean}
 */
const isValidCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

module.exports = {
  calculateDistance,
  isWithinGeofence,
  findNearestWorksite,
  isValidCoordinates,
};
