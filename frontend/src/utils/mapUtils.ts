/**
 * Decode polyline6 encoded geometry (Mapbox polyline format)
 * @param encoded - Polyline6 encoded string
 * @returns Array of [longitude, latitude] coordinate pairs
 */
export function decodePolyline6(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lng / 1e6, lat / 1e6]);
  }

  return coordinates;
}

/**
 * Find the closest point on a line segment to a given point
 * @param point - The point to check distance from
 * @param a - First endpoint of line segment
 * @param b - Second endpoint of line segment
 * @returns Closest point on segment AB to the given point
 */
export function closestPointOnSegment(
  point: [number, number],
  a: [number, number],
  b: [number, number]
): [number, number] {
  const [px, py] = point;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  
  // Handle degenerate case where segment is a point
  if (dx === 0 && dy === 0) {
    return a;
  }
  
  // Compute parameter t for projection onto line
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  
  // Clamp t to segment bounds [0, 1]
  const clamped = Math.max(0, Math.min(1, t));
  
  return [ax + clamped * dx, ay + clamped * dy];
}

/**
 * Find the nearest point on a polyline to a given point
 * @param point - The point to check distance from
 * @param line - Array of points forming a polyline
 * @returns Nearest point on the polyline to the given point
 */
export function nearestPointOnLine(
  point: [number, number],
  line: [number, number][]
): [number, number] {
  if (line.length === 0) {
    throw new Error("Line must have at least one point");
  }
  
  let nearest = line[0];
  let bestDist = Infinity;
  
  for (let i = 0; i < line.length - 1; i += 1) {
    const candidate = closestPointOnSegment(point, line[i], line[i + 1]);
    const dx = point[0] - candidate[0];
    const dy = point[1] - candidate[1];
    const dist = dx * dx + dy * dy;
    
    if (dist < bestDist) {
      bestDist = dist;
      nearest = candidate;
    }
  }
  
  return nearest;
}
