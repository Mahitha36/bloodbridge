const calculateDistance = require("./calculateDistance");

// distance returned in KM
module.exports = (userLocation, fenceCenter, fenceRadiusMeters) => {
  const distanceKm = calculateDistance(
    userLocation.lat,
    userLocation.lng,
    fenceCenter.lat,
    fenceCenter.lng
  );

  const distanceMeters = distanceKm * 1000;
  return distanceMeters <= fenceRadiusMeters;
};
