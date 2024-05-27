import { deepStrictEqual } from 'node:assert/strict';
import { BBox } from 'geojson';
import { SUPPORTED_CRS } from '../constants';
import { encodeToJSON } from '../crs/crs';
import type { BoundingBox } from '../geometries/boundingBox';
import type { Geometry } from '../geometries/geometry';
import { Point } from '../geometries/point';
import type { GeoJSONGeometry } from '../geometries/types';
import type { TileMatrixSet } from '../tiles/tileMatrixSet';
import type { TileRange } from '../tiles/tileRange';
import { tileMatrixToBBox } from '../tiles/tiles';
import type { CRS as CRSType, TileMatrix, TileMatrixId } from '../tiles/types';
import type { ArrayElement, CoordRefSysJSON } from '../types';

export function validateCRS(coordRefSys: CoordRefSysJSON['coordRefSys']): void {
  // currently only the default CRS (OGC:CRS84) is supported
  if (coordRefSys !== undefined && !SUPPORTED_CRS.includes(coordRefSys)) {
    throw new Error('unsupported CRS');
  }
}

export function validateCRSByOtherCRS(geometryCRS: CRSType, tileMatrixSetCRS: CRSType): void {
  try {
    deepStrictEqual(geometryCRS, tileMatrixSetCRS);
  } catch (err) {
    throw new Error("geometry's and tile matrix set's CRS do not match");
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
 * Validates that the input `metatile` is valid
 * @param metatile the metatile size
 */
export function validateMetatile(metatile: number): void {
  if (metatile <= 0) {
    throw new Error('metatile must be larger than 0');
  }
}

/**
 * Validates that the input `tileMatrix` is valid
 * @param tileMatrix the tile matrix to validate
 */
export function validateTileMatrix(tileMatrix: TileMatrix): void {
  if (tileMatrix.matrixWidth < 1) {
    throw new Error('width of tile matrix must be at least 1');
  }

  if (tileMatrix.matrixHeight < 1) {
    throw new Error('height of tile matrix must be at least 1');
  }

  if (tileMatrix.tileWidth < 1) {
    throw new Error('tile width of a tile matrix must be at least 1');
  }

  if (tileMatrix.tileHeight < 1) {
    throw new Error('tile height of a tile matrix must be at least 1');
  }
}

/**
 * Validates that the input `boundingBox` is a valid bounding box with respect to `tileMatrix`
 * @param boundingBox bounding box
 * @param tileMatrix tile matrix to validate against
 */
export function validateBoundingBoxByTileMatrix(boundingBox: BoundingBox, tileMatrix: TileMatrix): void {
  const [minEast, minNorth, maxEast, maxNorth] = boundingBox.bBox;
  const minPoint = new Point({ coordinates: [minEast, minNorth], coordRefSys: encodeToJSON(boundingBox.coordRefSys) });
  const maxPoint = new Point({ coordinates: [maxEast, maxNorth], coordRefSys: encodeToJSON(boundingBox.coordRefSys) });

  try {
    validatePointByTileMatrix(minPoint, tileMatrix);
    validatePointByTileMatrix(maxPoint, tileMatrix);
  } catch (err) {
    throw new RangeError(`bounding box is not within the tile matrix`);
  }
}

/**
 * Validates that the input `geometry` is a valid with respect to `tileMatrixSet`
 * @param geometry geometry
 * @param tileMatrix tile matrix
 */
export function validateGeometryByTileMatrix<G extends GeoJSONGeometry>(geometry: Geometry<G>, tileMatrix: TileMatrix): void {
  const bBox = geometry.bBox;
  validateBBoxByTileMatrix(bBox, geometry.coordRefSys, tileMatrix);
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
}
