import { describe, it, expect } from 'vitest';
import { setObsPositions, getObsPositions, copyObsPositions } from './obs-positions.js';

describe('obs-positions.ts', () => {
  const obsIndex = ['a', 'b', 'c'];

  it('returns positions only for the observation index they were recorded against', () => {
    const ids = ['c', 'a'];
    setObsPositions(ids, obsIndex, [2, 0]);
    expect(getObsPositions(ids, obsIndex)).toEqual([2, 0]);
    expect(getObsPositions(ids, [...obsIndex])).toEqual(null);
    expect(getObsPositions(['c', 'a'], obsIndex)).toEqual(null);
  });

  it('copies positions to a derived array', () => {
    const ids = ['b'];
    const set = ids.map(id => [id, null]);
    copyObsPositions(ids, set);
    expect(getObsPositions(set, obsIndex)).toEqual(null);
    setObsPositions(ids, obsIndex, [1]);
    copyObsPositions(ids, set);
    expect(getObsPositions(set, obsIndex)).toEqual([1]);
  });
});
