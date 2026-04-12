import {
  VitessceConfig,
  hconcat,
  vconcat,
  CoordinationLevel as CL,
  getInitialCoordinationScopePrefix,
} from '@vitessce/config';
import { FileType } from '@vitessce/constants';

const sdataUrl = 'https://sdata-padua-2026.s3.eu-north-1.amazonaws.com/Xenium_V1_Human_Kidney_FFPE_Protein_updated2.zarr/';
const ifImageUrl = 'https://sdata-padua-2026.s3.eu-north-1.amazonaws.com/Xenium_V1_Human_Kidney_FFPE_Protein_updated2.zarr/images/if_image';

/** Ten genes present in this panel (from var/feature_name). */
const DOTPLOT_GENES = [
  'ABCC11', 'ACE2', 'ACKR1', 'ACTA2', 'ACTG2', 'AQP2', 'AQP3', 'AGER', 'ANPEP', 'ASCL1',
];

function generatePaduaKidneyXeniumConfig() {
  const vc = new VitessceConfig({
    schemaVersion: '1.0.18',
    name: 'Padua SpatialData — Kidney Xenium (profile)',
    description: 'H&E + IF, cell/nucleus labels and boundaries, transcript points, UMAP, obs sets (level1/level2), dot plot.',
  });

  const coordinationValues = {
    obsType: 'cell',
    featureType: 'gene',
    featureValueType: 'expression',
  };

  const region = 'nucleus_boundaries';
  const tablePath = 'tables/table';

  let dataset = vc.addDataset('Xenium kidney');

  dataset = dataset.addFile({
    fileType: FileType.SPATIALDATA_ZARR,
    url: sdataUrl,
    coordinationValues: {
      ...coordinationValues,
      fileUid: 'sdata-he',
    },
    options: {
      image: {
        path: 'images/he_image',
      },
      coordinateSystem: 'global',
    },
  });

  dataset = dataset.addFile({
    fileType: FileType.SPATIALDATA_ZARR,
    url: sdataUrl,
    coordinationValues: {
      ...coordinationValues,
      embeddingType: 'UMAP',
    },
    options: {
      tablePath,
      region,
      obsFeatureMatrix: {
        path: 'tables/table/X',
        region,
      },
      obsSets: {
        tablePath,
        region,
        obsSets: [
          { name: 'Level 1', path: 'tables/table/obs/level1' },
          { name: 'Level 2', path: 'tables/table/obs/level2' },
        ],
      },
      obsEmbedding: [{
        path: 'tables/table/obsm/X_umap',
        embeddingType: 'UMAP',
        dims: [0, 1],
      }],
    },
  });

  const segOpts = (path, fileUid) => ({
    fileType: FileType.SPATIALDATA_ZARR,
    url: sdataUrl,
    coordinationValues: {
      ...coordinationValues,
      fileUid,
    },
    options: {
      obsSegmentations: {
        path,
        tablePath,
        coordinateSystem: 'global',
      },
    },
  });

  dataset = dataset
    .addFile(segOpts('labels/cell_labels', 'cell-labels'))
    .addFile(segOpts('labels/nucleus_labels', 'nucleus-labels'))
    .addFile(segOpts('shapes/cell_boundaries', 'cell-boundaries'))
    .addFile(segOpts('shapes/nucleus_boundaries', 'nucleus-boundaries'));

  /** Per-molecule transcript locations (SpatialData Points → parquet under points/transcripts). */
  dataset = dataset.addFile({
    fileType: FileType.SPATIALDATA_ZARR,
    url: sdataUrl,
    coordinationValues: {
      obsType: 'point',
      featureType: 'gene',
      featureValueType: 'expression',
    },
    options: {
      obsPoints: {
        path: 'points/transcripts_with_morton_codes',
      },
      coordinateSystem: 'global',
    },
  });

  dataset = dataset.addFile({
    url: ifImageUrl,
    fileType: 'image.ome-zarr',
    coordinationValues: {
      fileUid: 'if-image',
    },
  });

  const spatialView = vc.addView(dataset, 'spatialBeta');
  const lcView = vc.addView(dataset, 'layerControllerBeta');
  const obsSetsView = vc.addView(dataset, 'obsSets');
  const scatterView = vc.addView(dataset, 'scatterplot');
  const dotPlotView = vc.addView(dataset, 'dotPlot');

  const [featureSelectionScope, obsColorEncodingScope, featureValueColormapRangeScope] = vc.addCoordination(
    'featureSelection',
    'obsColorEncoding',
    'featureValueColormapRange',
  );
  featureSelectionScope.setValue(DOTPLOT_GENES);
  obsColorEncodingScope.setValue('geneSelection');
  featureValueColormapRangeScope.setValue([0, 1]);

  vc.linkViews([scatterView], ['embeddingType'], ['UMAP']);

  // Link obsType on analytical + spatial views only. Omit layerControllerBeta so the
  // controller can render segmentation labels from fileUid rather than a generic obsType.
  vc.linkViews(
    [spatialView, scatterView, obsSetsView, dotPlotView],
    ['obsType', 'featureType', 'featureValueType'],
    ['cell', 'gene', 'expression'],
  );
  vc.linkViews(
    [lcView],
    ['featureType', 'featureValueType'],
    ['gene', 'expression'],
  );

  vc.linkViews(
    [spatialView, scatterView, obsSetsView, dotPlotView],
    ['obsSetSelection', 'obsSetColor', 'additionalObsSets'],
  );

  vc.linkViewsByObject(
    [spatialView, scatterView, dotPlotView],
    {
      featureSelection: featureSelectionScope,
      obsColorEncoding: obsColorEncodingScope,
      featureValueColormapRange: featureValueColormapRangeScope,
    },
    { meta: false },
  );

  vc.linkViewsByObject([spatialView, lcView], {
    imageLayer: CL([
      {
        fileUid: 'if-image',
        spatialLayerOpacity: 1,
        spatialLayerVisible: true,
        photometricInterpretation: 'BlackIsZero',
        imageChannel: CL([
          {
            spatialTargetC: 0,
            spatialChannelColor: [255, 255, 255],
            spatialChannelVisible: true,
            spatialChannelOpacity: 1.0,
            spatialChannelWindow: [0, 255],
          },
          {
            spatialTargetC: 1,
            spatialChannelColor: [255, 64, 64],
            spatialChannelVisible: true,
            spatialChannelOpacity: 1.0,
            spatialChannelWindow: [0, 255],
          },
          {
            spatialTargetC: 2,
            spatialChannelColor: [64, 255, 64],
            spatialChannelVisible: true,
            spatialChannelOpacity: 1.0,
            spatialChannelWindow: [0, 255],
          },
          {
            spatialTargetC: 3,
            spatialChannelColor: [64, 128, 255],
            spatialChannelVisible: true,
            spatialChannelOpacity: 1.0,
            spatialChannelWindow: [0, 255],
          },
          {
            spatialTargetC: 8,
            spatialChannelColor: [255, 220, 64],
            spatialChannelVisible: true,
            spatialChannelOpacity: 1.0,
            spatialChannelWindow: [0, 255],
          },
          {
            spatialTargetC: 9,
            spatialChannelColor: [255, 64, 255],
            spatialChannelVisible: true,
            spatialChannelOpacity: 1.0,
            spatialChannelWindow: [0, 255],
          },
        ]),
      },
      {
        fileUid: 'sdata-he',
        spatialLayerOpacity: 1,
        spatialLayerVisible: true,
        photometricInterpretation: 'RGB',
      },
    ]),
  }, { scopePrefix: getInitialCoordinationScopePrefix('A', 'image') });

  vc.linkViewsByObject([spatialView, lcView], {
    segmentationLayer: CL([
      {
        fileUid: 'cell-labels',
        spatialLayerOpacity: 1,
        spatialLayerVisible: true,
        segmentationChannel: CL([
          {
            spatialTargetC: 0,
            spatialChannelVisible: true,
            spatialChannelOpacity: 0.45,
            spatialChannelColor: [80, 180, 255],
            obsHighlight: null,
            obsColorEncoding: 'cellSetSelection',
            spatialSegmentationFilled: true,
            spatialSegmentationStrokeWidth: 0,
          },
        ]),
      },
      {
        fileUid: 'nucleus-labels',
        spatialLayerOpacity: 1,
        spatialLayerVisible: true,
        segmentationChannel: CL([
          {
            spatialTargetC: 0,
            spatialChannelVisible: true,
            spatialChannelOpacity: 0.5,
            spatialChannelColor: [255, 200, 120],
            obsHighlight: null,
            obsColorEncoding: 'cellSetSelection',
            spatialSegmentationFilled: true,
            spatialSegmentationStrokeWidth: 0,
          },
        ]),
      },
      {
        fileUid: 'cell-boundaries',
        spatialLayerOpacity: 1,
        spatialLayerVisible: true,
        segmentationChannel: CL([
          {
            spatialChannelVisible: true,
            spatialChannelOpacity: 0.85,
            spatialChannelColor: [0, 255, 200],
            obsHighlight: null,
            obsColorEncoding: 'cellSetSelection',
            spatialSegmentationFilled: false,
            spatialSegmentationStrokeWidth: 1.2,
          },
        ]),
      },
      {
        fileUid: 'nucleus-boundaries',
        spatialLayerOpacity: 1,
        spatialLayerVisible: true,
        segmentationChannel: CL([
          {
            spatialChannelVisible: true,
            spatialChannelOpacity: 0.9,
            spatialChannelColor: [255, 80, 120],
            obsHighlight: null,
            obsColorEncoding: 'cellSetSelection',
            spatialSegmentationFilled: false,
            spatialSegmentationStrokeWidth: 1.0,
          },
        ]),
      },
    ]),
  }, { scopePrefix: getInitialCoordinationScopePrefix('A', 'obsSegmentations') });

  vc.linkViewsByObject([spatialView, lcView], {
    spatialTargetZ: null,
    pointLayer: CL([
      {
        obsType: 'point',
        obsHighlight: null,
      },
    ]),
  }, { scopePrefix: getInitialCoordinationScopePrefix('A', 'obsPoints') });

  // 12x12 grid: spatial | (layer ctrl / obs sets) | (UMAP / dot plot)
  vc.layout(hconcat(
    spatialView,
    vconcat(lcView, obsSetsView),
    vconcat(scatterView, dotPlotView),
  ));

  return vc.toJSON();
}

export const spatialdataPaduaKidneyXeniumConfig = generatePaduaKidneyXeniumConfig();
