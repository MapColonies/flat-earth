import { deepStrictEqual } from 'node:assert/strict';
import { type BBox, type Position } from 'geojson';
import { SUPPORTED_CRS } from '../constants';
import type { BoundingBox } from '../geometries/boundingBox';
import type { Point } from '../geometries/point';
import type { TileMatrixSet } from '../tiles/tileMatrixSet';
import type { TileRange } from '../tiles/tileRange';
import { tileMatrixToBBox } from '../tiles/tiles';
import type { CRS as CRSType, TileMatrix, TileMatrixId } from '../tiles/types';
import type { ArrayElement, CoordRefSysJSON } from '../types';

/**
 * Validates that the input `bbox` is valid
 * @param bbox BBox to validate
 */
export function validateBBox(bbox: BBox): void {
  const [, minNorth, , maxNorth] = bbox;

  if (maxNorth < minNorth) {
    throw new Error('bounding box north bound must be equal or larger than south bound');
  }
}

export function validateCRS(coordRefSys: CoordRefSysJSON['coordRefSys']): void {
  // currently only the default CRS (OGC:CRS84) is supported
  if (coordRefSys !== undefined && !SUPPORTED_CRS.includes(coordRefSys)) {
    throw new Error('unsupported CRS');
  }
}

/**
 * Validates that the input `crs1` equals `crs2`
 * @param crs1 first CRS
 * @param crs2 second CRS
 */
export function validateCRSByOtherCRS(crs1: CRSType, crs2: CRSType): void {
  try {
    deepStrictEqual(crs1, crs2);
  } catch (err) {
    throw new Error('CRS mismatch');
  }
}

/**
 * Validates that the input `point` is valid with respect to `tileMatrixSet`
 * @param point point to validate
 * @param tileMatrixSet tile matrix set to validate `point` against
 */
export function validatePointByTileMatrixSet(point: Point, tileMatrixSet: TileMatrixSet): void {
  const { tileMatrices } = tileMatrixSet;

  for (const tileMatrix of tileMatrices) {
    validatePointByTileMatrix(point, tileMatrix);
  }
}

/**
 * Validates that the input `point` is valid with respect to `tileMatrix`
 * @param point point to validate
 * @param tileMatrix tile matrix to validate `point` against
 */
export function validatePointByTileMatrix(point: Point, tileMatrix: TileMatrix): void {
  const {
    coordinates: [east, north],
  } = point;
  const [tileMatrixBoundingBoxMinEast, tileMatrixBoundingBoxMinNorth, tileMatrixBoundingBoxMaxEast, tileMatrixBoundingBoxMaxNorth] =
    tileMatrixToBBox(tileMatrix);

  if (east < tileMatrixBoundingBoxMinEast || east > tileMatrixBoundingBoxMaxEast) {
    throw new RangeError(`point's easting, ${east}, is out of range of tile matrix bounding box of tile matrix: ${tileMatrix.identifier.code}`);
  }

  if (north < tileMatrixBoundingBoxMinNorth || north > tileMatrixBoundingBoxMaxNorth) {
    throw new RangeError(`point's northing, ${north}, is out of range of tile matrix bounding box of tile matrix: ${tileMatrix.identifier.code}`);
  }
}

/**
 * Validates that the input `position` is valid with respect to `tileMatrix`
 * @param position position to validate
 * @param tileMatrix tile matrix to validate `position` against
 */
export function validatePositionByTileMatrix(position: Position, tileMatrix: TileMatrix): void {
  const [east, north] = position;
  const [tileMatrixBoundingBoxMinEast, tileMatrixBoundingBoxMinNorth, tileMatrixBoundingBoxMaxEast, tileMatrixBoundingBoxMaxNorth] =
    tileMatrixToBBox(tileMatrix);

  if (east < tileMatrixBoundingBoxMinEast || east > tileMatrixBoundingBoxMaxEast) {
    throw new RangeError(`point's easting, ${east}, is out of range of tile matrix bounding box of tile matrix: ${tileMatrix.identifier.code}`);
  }

  if (north < tileMatrixBoundingBoxMinNorth || north > tileMatrixBoundingBoxMaxNorth) {
    throw new RangeError(`point's northing, ${north}, is out of range of tile matrix bounding box of tile matrix: ${tileMatrix.identifier.code}`);
  }
}

/**
 * Validates that the input `metatile` is valid
 * @param metatile the metatile size
 */
export function validateMetatile(metatile: number): void {
  if (metatile < 1 || !Number.isSafeInteger(metatile)) {
    throw new Error('metatile must be an integer with a value of at least 1');
  }
}

/**
 * Validates that the input `tileMatrix` is valid
 * @param tileMatrix the tile matrix to validate
 */
export function validateTileMatrix(tileMatrix: TileMatrix): void {
  const { matrixHeight, matrixWidth, tileHeight, tileWidth } = tileMatrix;
  if (matrixWidth < 1 && Number.isSafeInteger(matrixWidth)) {
    throw new Error('width of tile matrix must be an integer with a value of at least 1');
  }

  if (matrixHeight < 1 && Number.isSafeInteger(matrixHeight)) {
    throw new Error('height of tile matrix must be an integer with a value of at least 1');
  }

  if (tileWidth < 1 && Number.isSafeInteger(tileWidth)) {
    throw new Error('tile width of a tile matrix must be an integer with a value of at least 1');
  }

  if (tileHeight < 1 && Number.isSafeInteger(tileHeight)) {
    throw new Error('tile height of a tile matrix must be an integer with a value of at least 1');
  }
}

/**
 * Validates that the input `boundingBox` is a valid bounding box with respect to `tileMatrix`
 * @param boundingBox bounding box
 * @param tileMatrix tile matrix to validate against
 */
export function validateBoundingBoxByTileMatrix(boundingBox: BoundingBox, tileMatrix: TileMatrix): void {
  const [minEast, minNorth, maxEast, maxNorth] = boundingBox.bBox;

  try {
    validatePositionByTileMatrix([minEast, minNorth], tileMatrix);
    validatePositionByTileMatrix([maxEast, maxNorth], tileMatrix);
  } catch (err) {
    throw new RangeError(`bounding box is not within the tile matrix`);
  }
}

/**
 * Validates that the input `tileMatrixId` is valid with respect to `tileMatrixSet`
 * @param tileMatrixId tile matrix identifier to validate
 * @param tileMatrixSet the tile matrix set to validate `tileMatrixId` against
 */
export function validateTileMatrixIdByTileMatrixSet<T extends TileMatrixSet>(tileMatrixId: TileMatrixId<T>, tileMatrixSet: T): void {
  if (tileMatrixSet.tileMatrices.findIndex(({ identifier: { code: comparedTileMatrixId } }) => comparedTileMatrixId === tileMatrixId) < 0) {
    throw new Error('tile matrix id is not part of the given tile matrix set');
  }
}

/**
 * Validates that the input `tileRange` is valid with respect to `tileMatrix`
 * @param tileRange tile range to validate
 * @param tileMatrix tile matrix to validate against
 */
export function validateTileRangeByTileMatrix<T extends TileMatrixSet>(tileRange: TileRange<T>, tileMatrix: ArrayElement<T['tileMatrices']>): void {
  const { maxTileCol, maxTileRow, metatile, minTileCol, minTileRow } = tileRange;

  if (tileRange.tileMatrixId !== tileMatrix.identifier.code) {
    throw new Error('tile identifier is not equal to the tile matrix identifier');
  }

  if (maxTileCol < 0 || maxTileCol >= tileMatrix.matrixWidth / metatile) {
    throw new RangeError("tile range's maximum col index is out of range of the tile matrix");
  }

  if (maxTileRow < 0 || maxTileRow >= tileMatrix.matrixHeight / metatile) {
    throw new RangeError("tile range's maximum row index is out of range of the tile matrix");
  }

  if (minTileCol < 0 || minTileCol > maxTileCol) {
    throw new RangeError("tile range's minimum col index is out of range of the tile matrix");
  }

  if (minTileRow < 0 || minTileRow > maxTileRow) {
    throw new RangeError("tile range's minimum row index is out of range of the tile matrix");
  }

  if (!Number.isSafeInteger(maxTileCol)) {
    throw new Error('maximum col index must be an integer');
  }

  if (!Number.isSafeInteger(maxTileRow)) {
    throw new Error('maximum row index must be an integer');
  }

  if (!Number.isSafeInteger(minTileCol)) {
    throw new Error('minimum col index must be an integer');
  }

  if (!Number.isSafeInteger(minTileRow)) {
    throw new Error('minimum row index must be an integer');
  }
}
