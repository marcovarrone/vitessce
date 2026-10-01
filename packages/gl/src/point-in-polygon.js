/**
 * Get the bounding box of a polygon's outer ring.
 * @param {number[][][]} rings Polygon rings; the first is the outer ring.
 * @returns {number[]} [minX, minY, maxX, maxY]
 */
export function getRingsBounds(rings) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  rings[0].forEach(([x, y]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  return [minX, minY, maxX, maxY];
}

const MAX_BANDS = 4096;

/**
 * Build a point-in-polygon test for many points against one polygon.
 * It matches turf's booleanPointInPolygon: points on the outer ring or on a
 * hole's ring count as inside, and points strictly inside a hole do not.
 *
 * A lasso drawn by dragging has hundreds of vertices, and testing every edge
 * for each of hundreds of thousands of points takes seconds. The edges are
 * grouped into horizontal bands once, so each point only checks the few edges
 * that span its height.
 * @param {number[][][]} rings Closed polygon rings; the first is the outer ring
 * and the rest are holes.
 * @returns {(x: number, y: number) => boolean}
 */
export function createPointInPolygonTest(rings) {
  const edgeCoords = [];
  const edgeRings = [];
  rings.forEach((ring, r) => {
    for (let i = 1; i < ring.length; i += 1) {
      edgeCoords.push(ring[i - 1][0], ring[i - 1][1], ring[i][0], ring[i][1]);
      edgeRings.push(r);
    }
  });
  const numEdges = edgeRings.length;
  if (numEdges === 0) {
    return () => false;
  }
  let minY = Infinity;
  let maxY = -Infinity;
  for (let e = 0; e < numEdges; e += 1) {
    minY = Math.min(minY, edgeCoords[e * 4 + 1], edgeCoords[e * 4 + 3]);
    maxY = Math.max(maxY, edgeCoords[e * 4 + 1], edgeCoords[e * 4 + 3]);
  }
  const numBands = Math.min(numEdges, MAX_BANDS);
  const bandHeight = (maxY - minY) / numBands || 1;
  const getBand = y => Math.min(numBands - 1, Math.floor((y - minY) / bandHeight));
  const bands = Array.from({ length: numBands }, () => []);
  for (let e = 0; e < numEdges; e += 1) {
    const y0 = edgeCoords[e * 4 + 1];
    const y1 = edgeCoords[e * 4 + 3];
    const lastBand = getBand(Math.max(y0, y1));
    for (let b = getBand(Math.min(y0, y1)); b <= lastBand; b += 1) {
      bands[b].push(e);
    }
  }
  const crossings = new Uint8Array(rings.length);

  return (x, y) => {
    if (y < minY || y > maxY) {
      return false;
    }
    crossings.fill(0);
    const band = bands[getBand(y)];
    for (let k = 0; k < band.length; k += 1) {
      const e = band[k];
      // Edge endpoints relative to the point, which keeps the precision of
      // points very close to a vertex (as turf does).
      const u1 = edgeCoords[e * 4] - x;
      const v1 = edgeCoords[e * 4 + 1] - y;
      const u2 = edgeCoords[e * 4 + 2] - x;
      const v2 = edgeCoords[e * 4 + 3] - y;
      const cross = u1 * v2 - u2 * v1;
      if (cross === 0 && u1 * u2 <= 0 && v1 * v2 <= 0) {
        // On the boundary of the outer ring or of a hole.
        return true;
      }
      // Count edges crossing the ray from the point towards +x.
      if ((v1 > 0) !== (v2 > 0) && (v2 > v1 ? cross > 0 : cross < 0)) {
        crossings[edgeRings[e]] = 1 - crossings[edgeRings[e]];
      }
    }
    if (!crossings[0]) {
      return false;
    }
    for (let r = 1; r < crossings.length; r += 1) {
      if (crossings[r]) {
        return false;
      }
    }
    return true;
  };
}
