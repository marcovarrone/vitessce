/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-underscore-dangle */
// File adopted from nebula.gl's SelectionLayer
// https://github.com/uber/nebula.gl/blob/8e9c2ec8d7cf4ca7050909ed826eb847d5e2cd9c/modules/layers/src/layers/selection-layer.js
import { CompositeLayer } from 'deck.gl';
import { ScatterplotLayer } from '@deck.gl/layers';
import { SELECTION_TYPE } from 'nebula.gl';
import { EditableGeoJsonLayer } from '@nebula.gl/layers';
import { DrawPolygonByDraggingMode, ViewMode } from '@nebula.gl/edit-modes';
import { setObsPositions } from '@vitessce/utils';
import { runSelectionWithBusySignal } from './selection-busy.js';
import { getRingsBounds, createPointInPolygonTest } from './point-in-polygon.js';

const EDIT_TYPE_ADD = 'addFeature';
const EDIT_TYPE_CLEAR = 'clearFeatures';

class ClickableDrawPolygonByDraggingMode extends DrawPolygonByDraggingMode {
  // eslint-disable-next-line class-methods-use-this
  handleClick(event, props) {
    props.onEdit({ editType: EDIT_TYPE_CLEAR });
  }
}

const MODE_MAP = {
  [SELECTION_TYPE.POLYGON]: ClickableDrawPolygonByDraggingMode,
};

const defaultProps = {
  layerIds: [],
  onSelect: () => {},
  onSelectionBusy: null,
};

const EMPTY_DATA = {
  type: 'FeatureCollection',
  features: [],
};

const LAYER_ID_GEOJSON = 'selection-geojson';

const PASS_THROUGH_PROPS = [
  'lineWidthScale',
  'lineWidthMinPixels',
  'lineWidthMaxPixels',
  'lineWidthUnits',
  'lineJointRounded',
  'lineMiterLimit',
  'pointRadiusScale',
  'pointRadiusMinPixels',
  'pointRadiusMaxPixels',
  'lineDashJustified',
  'getLineColor',
  'getFillColor',
  'getPointRadius',
  'getLineWidth',
  'getLineDashArray',
  'getTentativeLineDashArray',
  'getTentativeLineColor',
  'getTentativeFillColor',
  'getTentativeLineWidth',
  'editHandlePointRadiusScale',
  'editHandlePointRadiusMinPixels',
  'editHandlePointRadiusMaxPixels',
  'getEditHandlePointColor',
  'getEditHandlePointRadius',
  'modeHandlers',
];

export default class SelectionLayer extends CompositeLayer {
  _selectPolygonObjects(coordinates) {
    const {
      flipY,
      obsLayers,
    } = this.props;

    const flippedCoordinates = (flipY
      ? coordinates.map(poly => poly.map(p => ([p[0], -p[1]])))
      : coordinates);

    const [minX, minY, maxX, maxY] = getRingsBounds(flippedCoordinates);
    const isPointInSelection = createPointInPolygonTest(flippedCoordinates);

    obsLayers.forEach((obsLayer) => {
      const {
        getObsCoords,
        obsQuadTree,
        obsCount,
        obsIndex,
        onSelect: layerOnSelect,
      } = obsLayer;

      // Create an array to store the results.
      // Clear the array before checking each new layer.
      const pickingIds = [];
      const pickingPositions = [];
      const addIfSelected = (obsI) => {
        const [x, y] = getObsCoords(obsI);
        if (x >= minX && x <= maxX && y >= minY && y <= maxY
          && isPointInSelection(x, y)) {
          pickingIds.push(obsIndex[obsI]);
          pickingPositions.push(obsI);
        }
      };

      if (obsQuadTree) {
        // quadtree.visit() takes a callback that returns a boolean:
        // If true returned, then the children of the node are _not_ visited.
        // If false returned, then the children of the node are visited.
        // Reference: https://github.com/d3/d3-quadtree#quadtree_visit
        obsQuadTree.visit((node, x0, y0, x1, y1) => {
          // Reject only nodes outside the lasso's bounding box. Polygon intersections
          // at every node are far costlier than testing the candidate points directly.
          // Keep touching boxes so points on the lasso boundary remain selectable.
          if (x0 > maxX || y0 > maxY || x1 < minX || y1 < minY) {
            return true;
          }
          // Check if this is a leaf node.
          if (!node.length) {
            let current = node;
            while (current) {
              addIfSelected(current.data);
              current = current.next;
            }
          }
          // Return false because we are not done.
          // We want to visit the children of this node.
          return false;
        });
      } else if (obsCount) {
        // Without a prebuilt quadtree, scanning every observation once is much
        // cheaper than building a tree for a single selection.
        for (let obsI = 0; obsI < obsCount; obsI += 1) {
          addIfSelected(obsI);
        }
      }
      // It is possible for a layer to have neither, for example if the layer
      // is a segmentation bitmask without associated obsLocations.

      // The positions are already known here, so record them for the color
      // encoding instead of having it look up every selected ID again.
      setObsPositions(pickingIds, obsIndex, pickingPositions);
      layerOnSelect(pickingIds);
    });
  }

  _selectEmpty() {
    const { obsLayers } = this.props;
    obsLayers.forEach((obsLayer) => {
      const { onSelect: layerOnSelect } = obsLayer;
      layerOnSelect([]);
    });
  }

  renderLayers() {
    const mode = MODE_MAP[this.props.selectionType] || ViewMode;

    const inheritedProps = {};
    PASS_THROUGH_PROPS.forEach((p) => {
      if (this.props[p] !== undefined) inheritedProps[p] = this.props[p];
    });
    const layers = [
      new EditableGeoJsonLayer(
        this.getSubLayerProps({
          id: LAYER_ID_GEOJSON,
          pickable: true,
          mode,
          modeConfig: {
            dragToDraw: true,
          },
          selectedFeatureIndexes: [],
          data: EMPTY_DATA,
          onEdit: ({ updatedData, editType }) => {
            const { onSelectionBusy } = this.props;
            if (editType === EDIT_TYPE_ADD) {
              const { coordinates } = updatedData.features[0].geometry;
              runSelectionWithBusySignal(
                onSelectionBusy, () => this._selectPolygonObjects(coordinates),
              );
            } else if (editType === EDIT_TYPE_CLEAR) {
              // We want to select an empty array to clear any previous selection.
              runSelectionWithBusySignal(onSelectionBusy, () => this._selectEmpty());
            }
          },
          _subLayerProps: {
            guides: {
              pointType: 'circle',
              _subLayerProps: {
                'points-circle': {
                  // Styling for editHandles goes here.
                  // Reference: https://github.com/uber/nebula.gl/issues/618#issuecomment-898466319
                  type: ScatterplotLayer,
                  radiusScale: 1,
                  stroked: true,
                  getLineWidth: 1,
                  radiusMinPixels: 1,
                  radiusMaxPixels: 3,
                  getPointRadius: 2,
                },
              },
            },
          },
          ...inheritedProps,
        }),
      ),
    ];

    return layers;
  }
}

SelectionLayer.layerName = 'SelectionLayer';
SelectionLayer.defaultProps = defaultProps;
