import tinycolor from 'tinycolor2';
import { isEqual } from 'lodash-es';
import {
  SETS_DATATYPE_OBS,
  HIERARCHICAL_SCHEMAS,
} from './constants.js';

/**
 * Execute a callback function based on a keypress event.
 * @param {object} event The event from onKeyPress
 * @param {string} key The key identifier to match.
 * @param {Function} callback The function to execute.
 */
export function callbackOnKeyPress(event, key, callback) {
  if (event.key === key) {
    event.preventDefault();
    callback();
  }
}

/**
 * Convert an array of [r, g, b] numbers to a hex color.
 * @param {number[]} rgbArray The color [r, g, b] array.
 * @returns {string} The hex color as a string.
 */
export function colorArrayToString(rgbArray) {
  return tinycolor({ r: rgbArray[0], g: rgbArray[1], b: rgbArray[2] }).toHexString();
}

/**
 * Convert a string color representation to an array of [r,g,b].
 * @param {string} colorString The color as a string.
 * @returns {number[]} The color as an array.
 */
export function colorStringToArray(colorString) {
  const colorObj = tinycolor(colorString).toRgb();
  return [colorObj.r, colorObj.g, colorObj.b];
}

/**
 * Get a string of help text for coloring a particular hierarchy level.
 * @param {integer} i The level. 1 for cluster, 2 for subcluster, etc.
 * @returns {string} The tooltip text for coloring the level.
 */
export function getLevelTooltipText(i) {
  if (i === 0) return 'Color by hierarchy';
  if (i <= 2) {
    const subs = j => ('sub'.repeat(j));
    return `Color by ${subs(i - 1)}cluster`;
  }
  return `Color by cluster level ${i}`;
}

export function isEqualOrPrefix(targetPath, testPath) {
  if (targetPath.length <= testPath.length) {
    return isEqual(targetPath, testPath.slice(0, targetPath.length));
  }
  return false;
}

export function tryRenamePath(targetPath, testPath, nextTargetPath) {
  if (isEqualOrPrefix(targetPath, testPath)) {
    return [...nextTargetPath, ...testPath.slice(nextTargetPath.length)];
  }
  return testPath;
}

export const PATH_SEP = '___';

export function pathToKey(path) {
  return path.join(PATH_SEP);
}

// Moved from src/components/utils.js

/**
 * Get the next unused numbered name, such as "Selection 3".
 * A name counts as used when it starts with the prefix and number,
 * not followed by another digit (so "Selection 10" does not use 1).
 * @param {object[]|undefined} nodes The sibling nodes.
 * @param {string} prefix The text before the number.
 * @param {string} suffix The text after the number.
 * @returns {string} The next name.
 */
export function getNextNumberedNodeName(nodes, prefix, suffix) {
  const isUsed = (name, stem) => name.startsWith(stem) && !/^\d/.test(name.slice(stem.length));
  let i = 1;
  if (nodes) {
    // eslint-disable-next-line no-loop-func
    while (nodes.find(n => isUsed(n.name, `${prefix}${i}`))) {
      // eslint-disable-next-line no-plusplus
      i++;
    }
  }
  return `${prefix}${i}${suffix}`;
}

export function mergeObsSets(cellSets, additionalCellSets) {
  return {
    version: HIERARCHICAL_SCHEMAS.latestVersion,
    datatype: SETS_DATATYPE_OBS,
    tree: [
      ...(cellSets ? cellSets.tree : []),
      ...(additionalCellSets ? additionalCellSets.tree : []),
    ],
  };
}

export function getObsInfoFromDataWithinRange(range, data) {
  const [lowerBound, upperBound] = range;

  const cellIds = data
    .filter(item => item.value >= lowerBound && item.value <= upperBound)
    .map(item => item.cellId);

  return cellIds;
}
