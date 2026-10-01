import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { treeToColorIndicesArray } from '@vitessce/sets-utils';
import { Scatterplot } from '@vitessce/scatterplot';
import { EmbeddingScatterplotSubscriber } from './EmbeddingScatterplotSubscriber.js';

const state = vi.hoisted(() => ({
  values: {},
  setters: {},
  index: [],
  embedding: null,
  sets: null,
  TitleInfo: vi.fn(({ children }) => children),
}));
vi.mock('@vitessce/vit-s', () => ({
  TitleInfo: state.TitleInfo,
  useReady: () => true,
  useUrls: () => [],
  useDeckCanvasSize: () => [0, 0, null],
  useUint8FeatureSelection: () => ({}),
  useExpressionValueGetter: () => () => 0,
  useGetObsInfo: () => () => ({}),
  useObsEmbeddingData: () => [{ obsIndex: state.index, obsEmbedding: state.embedding }, 'success', [], null],
  useObsSetsData: () => [{ obsSets: state.sets }, 'success', [], null],
  useAnnotationStoryData: () => [{}, 'success', [], null],
  useAnnotationFrameCoordination: () => {},
  useFeatureSelection: () => [null, [], 'success', []],
  useObsFeatureMatrixIndices: () => [{ obsIndex: state.index }, 'success', [], null],
  useFeatureLabelsData: () => [{}, 'success', [], null],
  useMultiObsLabels: () => [[], [], [], [], []],
  useSampleSetsData: () => [{}, 'success', [], null],
  useSampleEdgesData: () => [{}, 'success', [], null],
  useCoordination: () => [state.values, state.setters],
  useLoaders: () => ({}),
  useSetComponentHover: () => () => {},
  useSetComponentViewInfo: () => () => {},
  useInitialCoordination: () => ({ embeddingZoom: 0, embeddingTargetX: 0, embeddingTargetY: 0 }),
  useExpandedFeatureLabelsMap: () => [null, 'success'],
  useViewMapping: () => [{}, {}, {}],
}));
vi.mock('@vitessce/scatterplot', () => ({
  Scatterplot: vi.fn(() => null),
  ScatterplotTooltipSubscriber: () => null,
  ScatterplotOptions: () => null,
  getPointSizeDevicePixels: () => 1,
  getPointOpacity: () => 1,
}));
vi.mock('@vitessce/legend', () => ({ Legend: () => null }));
vi.mock('@vitessce/sets-utils', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, treeToColorIndicesArray: vi.fn(actual.treeToColorIndicesArray) };
});

it('encodes a new lasso selection once, without an intermediate update using the old selection', () => {
  // Start from feature value coloring: a lasso switches the encoding to set selection.
  state.index = Array.from({ length: 65536 }, (_, i) => `cell-${i}`);
  state.embedding = {
    shape: [2, state.index.length],
    data: [
      Float32Array.from(state.index, (_, i) => i % 256),
      Float32Array.from(state.index, (_, i) => Math.floor(i / 256)),
    ],
  };
  state.sets = {
    version: '0.1.3',
    tree: [{
      name: 'Types',
      children: [{ name: 'All', set: state.index.map(id => [id, null]) }],
    }],
  };
  state.values = {
    dataset: 'A',
    obsType: 'cell',
    embeddingType: 'UMAP',
    embeddingZoom: 0,
    embeddingTargetX: 0,
    embeddingTargetY: 0,
    embeddingPointsVisible: true,
    embeddingContoursVisible: false,
    obsSetSelection: [['Types', 'All']],
    additionalObsSets: null,
    obsSetColor: [{ path: ['Types', 'All'], color: [0, 0, 255] }],
    obsColorEncoding: 'geneSelection',
  };
  state.setters = Object.fromEntries([
    'AdditionalObsSets', 'ObsSetSelection', 'ObsSetColor', 'ObsColorEncoding',
  ].map(name => [`set${name}`, (value) => {
    state.values = { ...state.values, [name[0].toLowerCase() + name.slice(1)]: value };
  }]));
  const props = { uuid: 'umap', theme: 'dark' };
  const { rerender } = render(<EmbeddingScatterplotSubscriber {...props} />);
  const initialColorIndices = Scatterplot.mock.lastCall[0].obsColorIndices;
  const currentSelect = Scatterplot.mock.lastCall[0].setCellSelection;
  treeToColorIndicesArray.mockClear();
  Scatterplot.mockClear();
  state.TitleInfo.mockClear();

  act(() => {
    // The same callback the selection layer calls after its hit test.
    currentSelect(state.index.slice(0, 60000));
    rerender(<EmbeddingScatterplotSubscriber {...props} />);
  });

  // Encoding every observation is the expensive step, so it should run once,
  // with the new sets and the new selection together.
  expect(treeToColorIndicesArray).toHaveBeenCalledTimes(1);
  const [cellSets, selection] = treeToColorIndicesArray.mock.lastCall;
  expect(selection).toEqual(state.values.obsSetSelection);
  expect(cellSets.tree.map(node => node.name)).toContain('My Selections');

  // Before the deferred render, the view keeps showing the previous colors.
  const renderedColorIndices = Scatterplot.mock.calls.map(([plot]) => plot.obsColorIndices);
  const finalColorIndices = renderedColorIndices.at(-1);
  expect(finalColorIndices).not.toBe(initialColorIndices);
  expect(renderedColorIndices.every(colorIndices => (
    colorIndices === initialColorIndices || colorIndices === finalColorIndices
  ))).toBe(true);

  // The encoding switches in the same render as the colors. Switching it first
  // would color every cell by the previous selection (e.g. cell type labels).
  Scatterplot.mock.calls.forEach(([plot]) => {
    expect(plot.cellColorEncoding).toEqual(
      plot.obsColorIndices === finalColorIndices ? 'cellSetSelection' : 'geneSelection',
    );
  });

  // The loading indicator stays up while the previous colors are shown,
  // and clears in the render that shows the new ones.
  const renderedIsReady = state.TitleInfo.mock.calls.map(([titleInfo]) => titleInfo.isReady);
  expect(renderedIsReady.length).toEqual(renderedColorIndices.length);
  renderedColorIndices.forEach((colorIndices, i) => {
    expect(renderedIsReady[i]).toBe(colorIndices === finalColorIndices);
  });
});
