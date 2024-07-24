import { encodeToJSON } from '../crs/crs';
import { BoundingBox } from '../geometries/boundingBox';
import { Point } from '../geometries/point';
import { clampBBoxToBBox } from '../geometries/utilities';
import type { ArrayElement } from '../types';
import { validateMetatile, validateTileMatrixIdByTileMatrixSet } from '../validations/validations';
import type { TileMatrixSet } from './tileMatrixSet';
import { TileRange } from './tileRange';
import type { TileIndex } from './types';
import { positionToTileIndex, tileIndexToPosition, tileMatrixToBBox } from './utilities';

/**
 * Tile class that supports a metatile definition
 */
export class Tile<T extends TileMatrixSet> {
  private readonly tileMatrix: ArrayElement<T['tileMatrices']>;

  /**
   * Tile constructor
   * @param tileIndex tile index
   * @param tileMatrixSet tile matrix set
   * @param metatile size of a metatile
   */
  public constructor(
    public readonly tileIndex: TileIndex<T>,
    private readonly tileMatrixSet: T,
    public readonly metatile = 1
  ) {
    const { col, row, tileMatrixId } = tileIndex;
    validateMetatile(metatile);
    // validateTileMatrixSet(tileMatrixSet); // TODO: missing implementation
    validateTileMatrixIdByTileMatrixSet(tileMatrixId, tileMatrixSet);

    const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }

    if (col < 0 || row < 0 || col >= Math.ceil(tileMatrix.matrixWidth / metatile) || row >= Math.ceil(tileMatrix.matrixHeight / metatile)) {
      throw new RangeError('tile indices must be non-negative integers larger than 0 and less than tile matrix size (considering metatile size)');
    }

    this.tileMatrix = tileMatrix;
  }

  /**
   * Calculates a bounding box of a tile
   * @param clamp a boolean whether to clamp the calculated bounding box to the tile matrix's bounding box
   * @returns bounding box of the tile
   */
  public toBoundingBox(clamp = true): BoundingBox {
    const {
      coordinates: [east, north],
    } = this.toPoint();
    const tileBBox = tileMatrixToBBox({ ...this.tileMatrix, pointOfOrigin: [east, north] }, this.metatile, this.metatile);
    return new BoundingBox({
      bbox: clamp ? clampBBoxToBBox(tileBBox, tileMatrixToBBox(this.tileMatrix)) : tileBBox,
      coordRefSys: encodeToJSON(this.tileMatrixSet.crs),
    });
  }

  /**
   * Calculates a point at tile origin
   * @returns point of the tile origin, determined by `cornerOfOrigin` property of the tile matrix
   */
  public toPoint(): Point {
    const position = tileIndexToPosition(this.tileIndex, this.tileMatrixSet, this.metatile);
    return new Point({ coordinates: position, coordRefSys: encodeToJSON(this.tileMatrixSet.crs) });
  }

  /**
   * Converts tile to a tile range in another tile matrix
   * This method will help find what tiles are needed to cover a given tile at a different tile matrix
   * @param tileMatrixId target tile matrix identifier of `tileMatrixSet`
   * @returns tile range at the given tile matrix
   */
  public toTileRange(tileMatrixId: TileIndex<T>['tileMatrixId']): TileRange<T> {
    validateTileMatrixIdByTileMatrixSet(tileMatrixId, this.tileMatrixSet);

    const tileMatrix = this.tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }

    const { cornerOfOrigin = 'topLeft' } = tileMatrix;

    const { metatile } = this;
    const [minEast, minNorth, maxEast, maxNorth] = this.toBoundingBox(true).bBox;
    const { col: minTileCol, row: minTileRow } = positionToTileIndex(
      [minEast, cornerOfOrigin === 'topLeft' ? maxNorth : minNorth],
      this.tileMatrixSet,
      tileMatrixId,
      'none',
      metatile
    );
    const { col: maxTileCol, row: maxTileRow } = positionToTileIndex(
      [maxEast, cornerOfOrigin === 'topLeft' ? minNorth : maxNorth],
      this.tileMatrixSet,
      tileMatrixId,
      'both',
      metatile
    );

    return new TileRange(minTileCol, minTileRow, maxTileCol, maxTileRow, this.tileMatrixSet, tileMatrixId, metatile);
  }
}
