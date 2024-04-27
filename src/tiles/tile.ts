import { BoundingBox, Point } from '../classes';
import type { ArrayElement } from '../types';
import { validateMetatile, validateTileMatrix, validateTileMatrixIdByTileMatrixSet } from '../validations/validations';
import type { TileMatrixSet } from './tileMatrixSet';
import { TileRange } from './tileRange';
import { tileEffectiveHeight, tileEffectiveWidth, tileMatrixToBBox } from './tiles';
import type { TileIndex, TileMatrixId } from './types';

/**
 * Tile class that supports a metatile definition
 */
export class Tile<T extends TileMatrixSet> implements TileIndex<T> {
  private readonly tileMatrix: ArrayElement<T['tileMatrices']>;

  public constructor(
    public readonly col: number,
    public readonly row: number,
    private readonly tileMatrixSet: T,
    public readonly tileMatrixId: TileMatrixId<T>,
    public readonly metatile = 1
  ) {
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
    const tileBoundingBox = new BoundingBox({ bbox: tileBBox, coordRefSys: this.tileMatrixSet.crs });
    return clamp
      ? tileBoundingBox.clampToBoundingBox(new BoundingBox({ bbox: tileMatrixToBBox(this.tileMatrix), coordRefSys: this.tileMatrixSet.crs }))
      : tileBoundingBox;
  }

  /**
   * Calculates a point at tile origin
   * @returns point of the tile origin, determined by `cornerOfOrigin` property of the tile matrix
   */
  public toPoint(): Point {
    const { col, row, metatile } = this;
    const width = tileEffectiveWidth(this.tileMatrix) * metatile;
    const height = tileEffectiveHeight(this.tileMatrix) * metatile;

    const {
      pointOfOrigin: [originX, originY],
      cornerOfOrigin = 'topLeft',
    } = this.tileMatrix;

    const east = originX + col * width;
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const north = originY + (cornerOfOrigin === 'topLeft' ? -1 : 1) * row * height;

    return new Point({ coordinates: [east, north], coordRefSys: this.tileMatrixSet.crs });
  }

  /**
   * Converts tile to a tile range in any tile matrix
   * This method will help find what tiles are needed to cover a given tile at a different tile matrix
   * @param targetTileMatrix target tile matrix
   * @returns tile range at the given tile matrix
   */
  public toTileRange(targetTileMatrix: ArrayElement<T['tileMatrices']>): TileRange<T> {
    validateTileMatrix(targetTileMatrix);
    validateTileMatrixIdByTileMatrixSet(targetTileMatrix.identifier.code, this.tileMatrixSet);

    const { metatile } = this;
    const [minEast, minNorth, maxEast, maxNorth] = this.toBoundingBox(true).bBox;
    const minTilePoint = new Point({ coordinates: [minEast, minNorth], coordRefSys: this.tileMatrixSet.crs });
    const maxTilePoint = new Point({ coordinates: [maxEast, maxNorth], coordRefSys: this.tileMatrixSet.crs });
    const { col: minTileCol, row: minTileRow } = minTilePoint.toTile(this.tileMatrixSet, targetTileMatrix.identifier.code, false, metatile);
    const { col: maxTileCol, row: maxTileRow } = maxTilePoint.toTile(this.tileMatrixSet, targetTileMatrix.identifier.code, true, metatile);

    return new TileRange(minTileCol, minTileRow, maxTileCol, maxTileRow, this.tileMatrixSet, targetTileMatrix.identifier.code, metatile);
  }
}
