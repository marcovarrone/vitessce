import { PALETTE } from '@vitessce/utils';
import {
  SETS_DATATYPE_OBS,
  HIERARCHICAL_SCHEMAS,
} from './constants.js';
import { getNextNumberedNodeName } from './utils.js';

// The level-zero node of the user-defined obs sets
// which holds the selection sets.
export const SELECTION_SETS_GROUP_NAME = 'My Selections';

const SET_COLOR_ENCODING = 'cellSetSelection';

type ObsSetPath = string[];

interface ObsSetNode {
  name: string;
  set?: [string, number | null][];
  children?: ObsSetNode[];
}

interface ObsSets {
  version: string;
  datatype: string;
  tree: ObsSetNode[];
}

interface ObsSetColorEntry {
  path: ObsSetPath;
  color: number[];
}

export interface ObsSetActionValues {
  additionalObsSets?: ObsSets | null;
  obsSetColor?: ObsSetColorEntry[] | null;
}

export interface ObsSetActionSetters {
  setAdditionalObsSets: (value: ObsSets) => void;
  setObsSetColor: (value: ObsSetColorEntry[]) => void;
  setObsSetSelection: (value: ObsSetPath[]) => void;
  setObsColorEncoding: (value: string) => void;
}

export interface SelectionSetNaming {
  prefix?: string;
  suffix?: string;
  // Create the selection set even when it has no members
  // (e.g., an empty intersection), rather than clearing the selection.
  keepEmpty?: boolean;
}

export interface ObsSetActions {
  selectObs: (obsIds: string[], naming?: SelectionSetNaming) => void;
  selectSets: (paths: ObsSetPath[]) => void;
}

/**
 * Create the actions which change the obs set selection
 * of one coordination scope.
 * @param values The current obs set coordination values of the scope.
 * @param setters The obs set coordination setters of the scope.
 * @returns The selectObs and selectSets actions.
 */
export function createObsSetActions(
  values: ObsSetActionValues,
  setters: ObsSetActionSetters,
): ObsSetActions {
  function selectSets(paths: ObsSetPath[]) {
    setters.setObsSetSelection(paths);
    // Clearing the selection leaves the color encoding as it was.
    if (paths.length > 0) {
      setters.setObsColorEncoding(SET_COLOR_ENCODING);
    }
  }

  function selectObs(obsIds: string[], naming: SelectionSetNaming = {}) {
    const { prefix = 'Selection ', suffix = '', keepEmpty = false } = naming;
    if (obsIds.length === 0 && !keepEmpty) {
      // An empty obs selection (e.g., a lasso which missed every obs)
      // clears the selection rather than creating an empty set.
      selectSets([]);
      return;
    }
    const { additionalObsSets, obsSetColor } = values;
    const prevTree = additionalObsSets?.tree || [];
    const groupIndex = prevTree.findIndex(n => n.name === SELECTION_SETS_GROUP_NAME);
    const prevGroup = groupIndex === -1 ? undefined : prevTree[groupIndex];
    const prevChildren = prevGroup?.children || [];

    const name = getNextNumberedNodeName(prevChildren, prefix, suffix);
    // Copy only the nodes along the path to the new set,
    // so that existing sets (and their members) are reused as-is.
    const nextGroup = {
      ...prevGroup,
      name: SELECTION_SETS_GROUP_NAME,
      children: [...prevChildren, { name, set: obsIds.map(id => [id, null]) }],
    } as ObsSetNode;
    const nextTree = groupIndex === -1
      ? [...prevTree, nextGroup]
      : prevTree.map((node, i) => (i === groupIndex ? nextGroup : node));
    setters.setAdditionalObsSets({
      version: HIERARCHICAL_SCHEMAS.latestVersion,
      datatype: SETS_DATATYPE_OBS,
      tree: nextTree,
    });

    const path = [SELECTION_SETS_GROUP_NAME, name];
    setters.setObsSetColor([
      ...(obsSetColor || []),
      { path, color: PALETTE[prevChildren.length % PALETTE.length] },
    ]);
    selectSets([path]);
  }

  return { selectObs, selectSets };
}
