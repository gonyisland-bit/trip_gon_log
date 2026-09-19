/**
 * Solar Terminator (Day / Night boundary) astronomical calculation utility
 * Calculates the solar declination and Greenwich hour angle (GHA) for any given UTC time,
 * and generates the night shadow polygon coordinates covering the dark hemisphere.
 */

export interface SolarPosition {
  delta: number; // Solar declination in radians
  gha: number;   // Greenwich Hour Angle in radians
}

/**
 * Calculates current solar position using astronomical formulas based on J2000.0 epoch
 */
export function getSolarPosition(date: Date = new Date()): SolarPosition {
  const time = date.getTime();
  // Julian Day
  const julianDay = time / 86400000 + 2440587.5;
  const n = julianDay - 2451545.0; // Days since J2000.0

  // Mean longitude of the Sun (degrees)
  const L = (280.460 + 0.9856474 * n) % 360;
  // Mean anomaly of the Sun (radians)
  const g = ((357.528 + 0.9856003 * n) % 360) * (Math.PI / 180);
  // Ecliptic longitude of the Sun (radians)
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * (Math.PI / 180);

  // Obliquity of the ecliptic (radians)
  const epsilon = (23.439 - 0.0000004 * n) * (Math.PI / 180);

  // Solar declination (delta)
  const sinDelta = Math.sin(epsilon) * Math.sin(lambda);
  const delta = Math.asin(sinDelta);

  // Right Ascension (alpha)
  const y = Math.cos(epsilon) * Math.sin(lambda);
  const x = Math.cos(lambda);
  const alpha = Math.atan2(y, x);

  // Greenwich Mean Sidereal Time (GMST in radians)
  const gmst = ((280.46061837 + 360.98564736629 * n) % 360) * (Math.PI / 180);
  // Greenwich Hour Angle (GHA of Sun)
  const gha = gmst - alpha;

  return { delta, gha };
}

/**
 * Generates polygon coordinates for the night region on Earth.
 * Output format: [lat, lng][] suitable for Leaflet L.polygon.
 */
export function getNightTerminatorPolygon(date: Date = new Date(), lngStep: number = 2): [number, number][] {
  const { delta, gha } = getSolarPosition(date);
  const tanDelta = Math.tan(delta);

  const points: [number, number][] = [];

  // Traverse longitudes from -180 to 180
  for (let lng = -180; lng <= 180; lng += lngStep) {
    const lngRad = (lng * Math.PI) / 180;
    const hourAngle = lngRad + gha;
    
    // tan(latitude) = -cos(hourAngle) / tan(delta)
    let latDeg: number;
    if (Math.abs(tanDelta) < 1e-7) {
      // Equinox: line passes through equator
      latDeg = Math.cos(hourAngle) > 0 ? -90 : 90;
    } else {
      const latRad = Math.atan(-Math.cos(hourAngle) / tanDelta);
      latDeg = (latRad * 180) / Math.PI;
    }

    // Clamp latitude between -85 and 85 to stay inside standard Web Mercator range
    latDeg = Math.max(-85, Math.min(85, latDeg));
    points.push([latDeg, lng]);
  }

  // Close the polygon towards the pole currently in polar night
  // If delta >= 0 (Northern hemisphere summer), South pole is in night
  // If delta < 0 (Northern hemisphere winter), North pole is in night
  if (delta >= 0) {
    points.push([-85, 180]);
    points.push([-85, -180]);
  } else {
    points.push([85, 180]);
    points.push([85, -180]);
  }

  return points;
}

/**
 * Shifts polygon coordinates by an offset longitude (e.g. +360 or -360 for Leaflet world wrap)
 */
export function shiftPolygonCoordinates(points: [number, number][], lngOffset: number): [number, number][] {
  return points.map(([lat, lng]) => [lat, lng + lngOffset]);
}

/**
 * Calculates solar altitude (elevation) in degrees at a specific latitude and longitude.
 * Positive = above horizon (day), Negative = below horizon (night / twilight).
 * e.g., 0 to -6 deg = civil twilight, < -6 deg = dark night.
 */
export function getSolarAltitude(lat: number, lng: number, date: Date = new Date()): number {
  const { delta, gha } = getSolarPosition(date);
  const latRad = (lat * Math.PI) / 180;
  const hourAngle = (lng * Math.PI) / 180 + gha;

  const sinAlt = Math.sin(delta) * Math.sin(latRad) + Math.cos(delta) * Math.cos(latRad) * Math.cos(hourAngle);
  const clampedSinAlt = Math.max(-1, Math.min(1, sinAlt));
  return (Math.asin(clampedSinAlt) * 180) / Math.PI;
}

/**
 * Checks whether a given location (lat, lng) is currently in twilight or night.
 * Defaults to threshold of -3 degrees (sun just dipped below horizon).
 */
export function isLocationInNight(lat: number, lng: number, date: Date = new Date(), thresholdDeg: number = -3): boolean {
  return getSolarAltitude(lat, lng, date) <= thresholdDeg;
}

/**
 * Generates a continuous night terminator polygon spanning across multiple world wraps (e.g. -540 to +540 degrees).
 * Used for seamless CSS polygon clip-path masking across the entire pannable world map.
 */
export function getContinuousNightPolygon(
  date: Date = new Date(),
  lngStep: number = 2,
  minLng: number = -540,
  maxLng: number = 540
): [number, number][] {
  const { delta, gha } = getSolarPosition(date);
  const tanDelta = Math.tan(delta);
  const points: [number, number][] = [];

  for (let lng = minLng; lng <= maxLng; lng += lngStep) {
    const lngRad = (lng * Math.PI) / 180;
    const hourAngle = lngRad + gha;
    let latDeg: number;
    if (Math.abs(tanDelta) < 1e-7) {
      latDeg = Math.cos(hourAngle) > 0 ? -90 : 90;
    } else {
      const latRad = Math.atan(-Math.cos(hourAngle) / tanDelta);
      latDeg = (latRad * 180) / Math.PI;
    }
    latDeg = Math.max(-85, Math.min(85, latDeg));
    points.push([latDeg, lng]);
  }

  // Close the polygon towards the pole currently in polar night across the entire longitude span
  if (delta >= 0) {
    points.push([-85, maxLng]);
    points.push([-85, minLng]);
  } else {
    points.push([85, maxLng]);
    points.push([85, minLng]);
  }

  return points;
}
