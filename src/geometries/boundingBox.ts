import { encodeToJSON } from '../crs';
import { avoidNegativeZero, clampValues, tileEffectiveHeight, tileEffectiveWidth } from '../tiles';
import type { TileMatrixSet } from '../tiles/tileMatrixSet';
import { TileRange } from '../tiles/tileRange';
import type { TileMatrixId } from '../tiles/types';
import type { ArrayElement } from '../utils/types';
import { validateBoundingBoxByTileMatrix, validateCRSByOtherCRS, validateMetatile } from '../validations';
import { Point } from './point';
import { Polygon } from './polygon';
import type { BoundingBoxInput } from './types';

/**
 * Bounding box geometry class
 */
export class BoundingBox extends Polygon {
  /**
   * Bounding box geometry constructor
   * @param boundingBox GeoJSON BBox and CRS
   */
  public constructor(boundingBox: BoundingBoxInput) {
    const {
      bbox: [minEast, minNorth, maxEast, maxNorth],
      coordRefSys,
    } = boundingBox;

    super({
      coordinates: [
        [
          [minEast, minNorth],
          [maxEast, minNorth],
          [maxEast, maxNorth],
          [minEast, maxNorth],
          [minEast, minNorth],
        ],
      ],
      coordRefSys,
    });
  }

  /**
   * Clips bounding box extent by that of another bounding box
   * @param clippingBoundingBox bounding box to clip by
   * @returns bounding box with extents clipped by those of `clippingBoundingBox`
   */
  public clipByBoundingBox(clippingBoundingBox: BoundingBox): BoundingBox {
    const [clippingBoundingBoxMinEast, clippingBoundingBoxMinNorth, clippingBoundingBoxMaxEast, clippingBoundingBoxMaxNorth] =
      clippingBoundingBox.bBox;

    const [minEast, minNorth, maxEast, maxNorth] = this.bBox;

    return new BoundingBox({
      bbox: [
        clampValues(minEast, clippingBoundingBoxMinEast, clippingBoundingBoxMaxEast),
        clampValues(minNorth, clippingBoundingBoxMinNorth, clippingBoundingBoxMaxNorth),
        clampValues(maxEast, clippingBoundingBoxMinEast, clippingBoundingBoxMaxEast),
        clampValues(maxNorth, clippingBoundingBoxMinNorth, clippingBoundingBoxMaxNorth),
      ],
      coordRefSys: encodeToJSON(this.coordRefSys),
    });
  }

  /**
   * Expands bounding box to the containing tile matrix
   * @param tileMatrixSet tile matrix set
   * @param tileMatrixId tile matrix identifier of `tileMatrixSet`
   * @returns bounding box that contains the bunding box instance snapped to the tile matrix tiles
   */
  public expandToTileMatrixCells<T extends TileMatrixSet>(tileMatrixSet: T, tileMatrixId: TileMatrixId<T>): BoundingBox {
    // TODO: consider metatile
    // validateTileMatrixSet(tileMatrixSet); // TODO: missing implementation
    validateCRSByOtherCRS(this.coordRefSys, tileMatrixSet.crs);

    const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }

    validateBoundingBoxByTileMatrix(this, tileMatrix);

    const {
      coordinates: [minPointEast, minPointNorth],
    } = this.snapMinPointToTileMatrixCell(tileMatrix);
    const {
      coordinates: [maxPointEast, maxPointNorth],
    } = this.snapMaxPointToTileMatrixCell(tileMatrix);

    return new BoundingBox({ bbox: [minPointEast, minPointNorth, maxPointEast, maxPointNorth], coordRefSys: encodeToJSON(this.coordRefSys) });
  }

  /**
   * Calculates tile range that covers the bounding box
   * @param tileMatrixSet tile matrix set
   * @param tileMatrixId tile matrix identifier of `tileMatrixSet`
   * @param metatile size of a metatile
   * @returns tile range that covers the bounding box instance
   */
  public toTileRange<T extends TileMatrixSet>(tileMatrixSet: T, tileMatrixId: TileMatrixId<T>, metatile = 1): TileRange<T> {
    validateMetatile(metatile);
    // validateTileMatrixSet(tileMatrixSet); // TODO: missing implementation
    validateCRSByOtherCRS(this.coordRefSys, tileMatrixSet.crs);

    const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }

    validateBoundingBoxByTileMatrix(this, tileMatrix);

    const { cornerOfOrigin = 'topLeft' } = tileMatrix;
    const [minEast, minNorth, maxEast, maxNorth] = this.bBox;

    const minTilePoint = new Point({
      coordinates: [minEast, cornerOfOrigin === 'topLeft' ? maxNorth : minNorth],
      coordRefSys: encodeToJSON(this.coordRefSys),
    });
    const maxTilePoint = new Point({
      coordinates: [maxEast, cornerOfOrigin === 'topLeft' ? minNorth : maxNorth],
      coordRefSys: encodeToJSON(this.coordRefSys),
    });

    const {
      tileIndex: { col: minTileCol },
      tileIndex: { row: minTileRow },
    } = minTilePoint.toTile(tileMatrixSet, tileMatrixId, false, metatile);
    const {
      tileIndex: { col: maxTileCol },
      tileIndex: { row: maxTileRow },
    } = maxTilePoint.toTile(tileMatrixSet, tileMatrixId, true, metatile);

    return new TileRange(minTileCol, minTileRow, maxTileCol, maxTileRow, tileMatrixSet, tileMatrixId, metatile);
  }

  private snapMinPointToTileMatrixCell<T extends TileMatrixSet>(tileMatrix: ArrayElement<T['tileMatrices']>): Point {
    const [minEast, minNorth] = this.bBox;
    const width = tileEffectiveWidth(tileMatrix);
    const snappedMinEast = Math.floor(minEast / width) * width;
    const height = tileEffectiveHeight(tileMatrix);
    const snappedMinNorth = Math.floor(minNorth / height) * height;
    return new Point({
      coordinates: [avoidNegativeZero(snappedMinEast), avoidNegativeZero(snappedMinNorth)],
      coordRefSys: encodeToJSON(this.coordRefSys),
    });
  }

  private snapMaxPointToTileMatrixCell<T extends TileMatrixSet>(tileMatrix: ArrayElement<T['tileMatrices']>): Point {
    const [, , maxEast, maxNorth] = this.bBox;
    const width = tileEffectiveWidth(tileMatrix);
    const snappedMaxEast = Math.ceil(maxEast / width) * width;
    const height = tileEffectiveHeight(tileMatrix);
    const snappedMaxNorth = Math.ceil(maxNorth / height) * height;
    return new Point({
      coordinates: [avoidNegativeZero(snappedMaxEast), avoidNegativeZero(snappedMaxNorth)],
      coordRefSys: encodeToJSON(this.coordRefSys),
    });
  }
}
