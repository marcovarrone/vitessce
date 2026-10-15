import { describe, it, expect } from 'vitest';
import { PALETTE } from '@vitessce/utils';
import { createObsSetActions } from './obs-set-actions.js';

function createScope(values: Record<string, any> = {}) {
  const writes: Record<string, any> = {};
  const setters = {
    setAdditionalObsSets: (v: any) => { writes.additionalObsSets = v; },
    setObsSetColor: (v: any) => { writes.obsSetColor = v; },
    setObsSetSelection: (v: any) => { writes.obsSetSelection = v; },
    setObsColorEncoding: (v: any) => { writes.obsColorEncoding = v; },
  };
  return { actions: createObsSetActions(values, setters), writes };
}

function selectionsTree(children: { name: string; set: [string, null][] }[]) {
  return {
    version: '0.1.3',
    datatype: 'obs',
    tree: [
      { name: 'Clusters', children: [{ name: 'Cluster 1', set: [['a', null]] }] },
      { name: 'My Selections', children },
    ],
  };
}

describe('createObsSetActions', () => {
  describe('selectObs', () => {
    it('creates My Selections with the first selection set when there are no user-defined sets', () => {
      const { actions, writes } = createScope({ additionalObsSets: null, obsSetColor: null });
      actions.selectObs(['a', 'b']);

      expect(writes.additionalObsSets.tree).toEqual([
        { name: 'My Selections', children: [{ name: 'Selection 1', set: [['a', null], ['b', null]] }] },
      ]);
      expect(writes.obsSetColor).toEqual([{ path: ['My Selections', 'Selection 1'], color: PALETTE[0] }]);
      expect(writes.obsSetSelection).toEqual([['My Selections', 'Selection 1']]);
      expect(writes.obsColorEncoding).toBe('cellSetSelection');
    });

    it('appends a numbered selection set colored by its position', () => {
      const prevColor = [{ path: ['My Selections', 'Selection 1'], color: [1, 2, 3] }];
      const { actions, writes } = createScope({
        additionalObsSets: selectionsTree([{ name: 'Selection 1', set: [['a', null]] }]),
        obsSetColor: prevColor,
      });
      actions.selectObs(['c']);

      const group = writes.additionalObsSets.tree[1];
      expect(group.children.map((n: any) => n.name)).toEqual(['Selection 1', 'Selection 2']);
      expect(writes.obsSetColor).toEqual([
        ...prevColor,
        { path: ['My Selections', 'Selection 2'], color: PALETTE[1] },
      ]);
      expect(writes.obsSetSelection).toEqual([['My Selections', 'Selection 2']]);
    });

    it('leaves the previous user-defined sets unchanged and reuses untouched nodes', () => {
      const prev = selectionsTree([{ name: 'Selection 1', set: [['a', null]] }]);
      const prevGroupChildren = prev.tree[1].children;
      const { actions, writes } = createScope({ additionalObsSets: prev });
      actions.selectObs(['c']);

      expect(prev.tree[1].children).toBe(prevGroupChildren);
      expect(prevGroupChildren).toHaveLength(1);
      expect(writes.additionalObsSets).not.toBe(prev);
      expect(writes.additionalObsSets.tree[0]).toBe(prev.tree[0]);
      expect(writes.additionalObsSets.tree[1].children[0]).toBe(prevGroupChildren[0]);
    });

    it('does not read the members of earlier selection sets', () => {
      const earlierSet: [string, null][] = [['a', null]];
      let membersRead = 0;
      Object.defineProperty(earlierSet, '0', { get: () => { membersRead += 1; return ['a', null]; } });
      const { actions } = createScope({
        additionalObsSets: selectionsTree([{ name: 'Selection 1', set: earlierSet }]),
      });
      actions.selectObs(['c']);

      expect(membersRead).toBe(0);
    });

    it('clears the selection without creating a set or changing the encoding when no obs are selected', () => {
      const { actions, writes } = createScope({ additionalObsSets: null });
      actions.selectObs([]);

      expect(writes).toEqual({ obsSetSelection: [] });
    });

    it('creates an empty selection set when keepEmpty is set', () => {
      const { actions, writes } = createScope({ additionalObsSets: null });
      actions.selectObs([], { prefix: 'Intersection ', keepEmpty: true });

      expect(writes.additionalObsSets.tree[0].children).toEqual([{ name: 'Intersection 1', set: [] }]);
      expect(writes.obsSetSelection).toEqual([['My Selections', 'Intersection 1']]);
      expect(writes.obsColorEncoding).toBe('cellSetSelection');
    });

    it('numbers each prefix separately and keeps the suffix', () => {
      const { actions, writes } = createScope({
        additionalObsSets: selectionsTree([
          { name: 'Selection 1', set: [] },
          { name: 'Union 1', set: [] },
          { name: 'Union 2', set: [] },
        ]),
      });
      actions.selectObs(['a'], { suffix: ': based on CD3' });

      expect(writes.obsSetSelection).toEqual([['My Selections', 'Selection 2: based on CD3']]);
    });

    it('does not treat a two-digit number as using its first digit', () => {
      const { actions, writes } = createScope({
        additionalObsSets: selectionsTree([{ name: 'Selection 10', set: [] }]),
      });
      actions.selectObs(['a']);

      expect(writes.obsSetSelection).toEqual([['My Selections', 'Selection 1']]);
    });
  });

  describe('selectSets', () => {
    it('selects the paths and switches to set coloring', () => {
      const { actions, writes } = createScope();
      actions.selectSets([['Clusters', 'Cluster 1']]);

      expect(writes).toEqual({
        obsSetSelection: [['Clusters', 'Cluster 1']],
        obsColorEncoding: 'cellSetSelection',
      });
    });

    it('clears the selection without changing the encoding', () => {
      const { actions, writes } = createScope();
      actions.selectSets([]);

      expect(writes).toEqual({ obsSetSelection: [] });
    });
  });
});
