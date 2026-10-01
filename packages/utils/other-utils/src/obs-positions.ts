type ObsPositions = {
  obsIndex: ArrayLike<string>;
  positions: ArrayLike<number>;
};

// Keyed by the array of observation IDs (or the set built from it), so the
// entry is dropped together with the selection.
const obsPositionsByArray = new WeakMap<object, ObsPositions>();

/**
 * Record that arr[i] is the observation at obsIndex[positions[i]].
 * A lasso hit test already knows these positions, so recording them lets the
 * color encoding skip looking each ID up in obsIndex again.
 * @param arr Array of observation IDs, or of [obsId, confidence] tuples.
 * @param obsIndex The observation index that the positions refer to.
 * @param positions Positions into obsIndex, aligned with arr.
 */
export function setObsPositions(
  arr: object,
  obsIndex: ArrayLike<string>,
  positions: ArrayLike<number>,
): void {
  obsPositionsByArray.set(arr, { obsIndex, positions });
}

/**
 * Get the positions recorded for arr, if they refer to this obsIndex.
 * @param arr Array that was passed to setObsPositions.
 * @param obsIndex The observation index the caller is encoding against.
 * @returns The positions, or null when none were recorded for this obsIndex.
 */
export function getObsPositions(
  arr: object,
  obsIndex: ArrayLike<string>,
): ArrayLike<number> | null {
  const entry = obsPositionsByArray.get(arr);
  if (!entry || entry.obsIndex !== obsIndex) {
    return null;
  }
  return entry.positions;
}

/**
 * Carry recorded positions over to an array derived element-by-element from
 * another, e.g. a set of [obsId, confidence] tuples built from an ID array.
 * @param fromArr The array with recorded positions.
 * @param toArr The derived array, aligned with fromArr.
 */
export function copyObsPositions(fromArr: object, toArr: object): void {
  const entry = obsPositionsByArray.get(fromArr);
  if (entry) {
    obsPositionsByArray.set(toArr, entry);
  }
}
