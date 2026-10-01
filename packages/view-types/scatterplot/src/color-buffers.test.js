import { describe, it, expect } from 'vitest';
import {
  makeColorIndicesGetCellColors, makeColorIndicesBuffer, makeIsSelectedBuffer,
} from './color-buffers.js';

describe('color-buffers.js', () => {
  const colors = [[255, 0, 0], [0, 100, 200]];
  const colorIndices = Uint8Array.from([0, 1, 2, 1, 3]);

  [null, Float32Array.from([1, 0.5, 0.25, 1, 0.75])].forEach((colorProbs) => {
    it(`matches the per-point accessor ${colorProbs ? 'with' : 'without'} confidence scores`, () => {
      const obsColorIndices = { colorIndices, colorProbs, colors };
      const getColor = makeColorIndicesGetCellColors(obsColorIndices, 'dark');
      const buffer = makeColorIndicesBuffer(obsColorIndices, 'dark', colorIndices.length);
      // deck.gl stores accessor results in a Uint8ClampedArray, so compare against that.
      const expected = new Uint8ClampedArray(colorIndices.length * 4);
      colorIndices.forEach((_, index) => expected.set(getColor(null, { index }), index * 4));
      expect(buffer).toEqual(expected);
    });
  });

  it('fills the selection flags from the accessor', () => {
    const getCellIsSelected = (object, { index }) => (index % 2 ? 1 : 0);
    expect(Array.from(makeIsSelectedBuffer(getCellIsSelected, 4))).toEqual([0, 1, 0, 1]);
  });
});
