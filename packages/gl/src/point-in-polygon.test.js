import { describe, it, expect } from 'vitest';
import { polygon as turfPolygon } from '@turf/helpers';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { createPointInPolygonTest, getRingsBounds } from './point-in-polygon.js';

const isPointInRings = (x, y, rings) => createPointInPolygonTest(rings)(x, y);

const square = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]];
const hole = [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]];
// A concave "C" shape, open towards +x.
const concave = [[0, 0], [4, 0], [4, 1], [1, 1], [1, 3], [4, 3], [4, 4], [0, 4], [0, 0]];

describe('point-in-polygon.js', () => {
  it('includes points on the outer boundary and vertices', () => {
    expect(isPointInRings(2, 0, [square])).toBe(true);
    expect(isPointInRings(4, 4, [square])).toBe(true);
    expect(isPointInRings(0, 2, [square])).toBe(true);
    expect(isPointInRings(5, 2, [square])).toBe(false);
  });

  it('keeps the precision of points very close to a vertex', () => {
    // The vertex is at x = 1.5 * cos(pi / 2), about 9e-17, so (0, 1.5) is just
    // below the notch of this V shape and inside it.
    const notch = [
      [1.2, 3.8], [1.5 * Math.cos(Math.PI / 2), 1.5], [-1.2, 3.8], [-1.2, 0], [1.2, 0], [1.2, 3.8],
    ];
    expect(isPointInRings(0, 1.5, [notch])).toBe(true);
    expect(isPointInRings(0, 1.5, [notch.slice().reverse()])).toBe(true);
  });

  it('excludes points inside holes but keeps the hole boundary', () => {
    expect(isPointInRings(2, 2, [square, hole])).toBe(false);
    expect(isPointInRings(1, 2, [square, hole])).toBe(true);
    expect(isPointInRings(0.5, 0.5, [square, hole])).toBe(true);
  });

  it('agrees with turf on random points', () => {
    let seed = 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const star = Array.from({ length: 21 }, (_, k) => {
      const radius = k % 2 === 0 ? 4 : 1.5;
      const angle = (k / 20) * 2 * Math.PI;
      return [radius * Math.cos(angle), radius * Math.sin(angle)];
    });
    [star[20]] = star;
    // Like a lasso drawn by dragging: hundreds of vertices with a wobbly outline.
    const lasso = Array.from({ length: 401 }, (_, k) => {
      const angle = (k / 400) * 2 * Math.PI;
      const radius = 3 + Math.sin(angle * 7) + 0.5 * Math.cos(angle * 31);
      return [radius * Math.cos(angle), radius * Math.sin(angle)];
    });
    [lasso[400]] = lasso;
    [[square, hole], [concave], [star], [lasso]].forEach((rings) => {
      const turfRings = turfPolygon(rings);
      for (let n = 0; n < 2000; n += 1) {
        // Snap half of the points to a grid so many land on edges and vertices.
        const x = n % 2 ? random() * 10 - 5 : Math.round(random() * 20 - 10) / 2;
        const y = n % 2 ? random() * 10 - 5 : Math.round(random() * 20 - 10) / 2;
        expect(isPointInRings(x, y, rings)).toBe(booleanPointInPolygon([x, y], turfRings));
      }
    });
  });

  it('gets the bounds of the outer ring', () => {
    expect(getRingsBounds([concave, hole])).toEqual([0, 0, 4, 4]);
  });
});
