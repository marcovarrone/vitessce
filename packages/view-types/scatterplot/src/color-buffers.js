import { getDefaultColor } from '@vitessce/utils';

// The gray that set colors are mixed toward as confidence drops. Must match the
// mixing color used by treeToCellColorsBySetNames in @vitessce/sets-utils.
export const UNCERTAINTY_MIXING_COLOR = 128;

// Positional equivalent of makeDefaultGetCellColors, for callers that supply
// obsColorIndices. Reads a typed array by index rather than hashing an
// observation ID string on every point.
export const makeColorIndicesGetCellColors = (obsColorIndices, theme) => {
  const { colorIndices, colorProbs, colors } = obsColorIndices;
  const defaultColor = getDefaultColor(theme);
  return (object, { index }) => {
    const colorIndex = colorIndices[index];
    if (colorIndex === 0) {
      return [defaultColor[0], defaultColor[1], defaultColor[2], 255];
    }
    const color = colors[colorIndex - 1] || defaultColor;
    if (colorProbs) {
      const p = colorProbs[index];
      return [
        ((color[0] - UNCERTAINTY_MIXING_COLOR) * p) + UNCERTAINTY_MIXING_COLOR,
        ((color[1] - UNCERTAINTY_MIXING_COLOR) * p) + UNCERTAINTY_MIXING_COLOR,
        ((color[2] - UNCERTAINTY_MIXING_COLOR) * p) + UNCERTAINTY_MIXING_COLOR,
        255,
      ];
    }
    return [color[0], color[1], color[2], 255];
  };
};
// Fill the color buffer that deck.gl would otherwise build by calling the
// getFillColor accessor and normalizing its result once per point. Matches
// makeColorIndicesGetCellColors.
export const makeColorIndicesBuffer = (obsColorIndices, theme, numObs) => {
  const { colorIndices, colorProbs, colors } = obsColorIndices;
  const defaultColor = getDefaultColor(theme);
  // Flat RGB palette where entry 0 is the color of observations in no selected set.
  const palette = new Float64Array((colors.length + 1) * 3);
  [defaultColor, ...colors].forEach((color, k) => {
    palette.set((color || defaultColor).slice(0, 3), k * 3);
  });
  const buffer = new Uint8ClampedArray(numObs * 4);
  for (let index = 0; index < numObs; index += 1) {
    const colorIndex = colorIndices[index];
    const p = (colorProbs && colorIndex !== 0) ? colorProbs[index] : 1;
    const offset = index * 4;
    // Like the accessor, an index without a color falls back to the default color.
    const paletteIndex = colorIndex <= colors.length ? colorIndex : 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const value = palette[paletteIndex * 3 + channel];
      buffer[offset + channel] = p === 1
        ? value
        : ((value - UNCERTAINTY_MIXING_COLOR) * p) + UNCERTAINTY_MIXING_COLOR;
    }
    buffer[offset + 3] = 255;
  }
  return buffer;
};
export const makeIsSelectedBuffer = (getCellIsSelected, numObs) => {
  const buffer = new Float32Array(numObs);
  for (let index = 0; index < numObs; index += 1) {
    buffer[index] = getCellIsSelected(null, { index });
  }
  return buffer;
};
