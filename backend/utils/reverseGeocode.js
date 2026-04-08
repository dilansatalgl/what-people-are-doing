const reverseGeocode = async (latitude, longitude) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "what-people-are-doing/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Reverse geocoding failed");
  }

  const data = await response.json();
  const address = data.address || {};

  const district =
    address.city_district ||
    address.borough ||
    address.township ||
    address.municipality ||
    address.district ||
    null;

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.province ||
    address.state_district ||
    null;

  const country = address.country || null;

  if (district && city && country) {
    return `${district}/${city}, ${country}`;
  }

  if (city && country) {
    return `${city}, ${country}`;
  }

  if (country) {
    return country;
  }

  return null;
};

module.exports = reverseGeocode;