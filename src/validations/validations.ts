import { deepStrictEqual } from 'node:assert/strict';
import { BoundingBox, Point, type Geometry } from '../classes';
import { TileMatrixSet } from '../tiles/tileMatrixSet';
import type { TileRange } from '../tiles/tileRange';
import { tileMatrixToBoundingBox } from '../tiles/tiles';
import type { CRS, TileMatrix, TileMatrixId } from '../tiles/types';
import type { ArrayElement, GeoJSONGeometry } from '../types';

export function validateCRS(geometryCRS: CRS, tileMatrixSetCRS: CRS): void {
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
  const {
    coordinates: [east, north],
  } = point;
  const { tileMatrices } = tileMatrixSet;

  for (const tileMatrix of tileMatrices) {
    const {
      min: {
        coordinates: [tileMatrixSetBoundingBoxMinEast, tileMatrixSetBoundingBoxMinNorth],
      },
      max: {
        coordinates: [tileMatrixSetBoundingBoxMaxEast, tileMatrixSetBoundingBoxMaxNorth],
      },
    } = tileMatrixToBoundingBox(tileMatrix, tileMatrixSet.crs);

    if (east < tileMatrixSetBoundingBoxMinEast || east > tileMatrixSetBoundingBoxMaxEast) {
      throw new RangeError(
        `point's easting, ${east}, is out of range of tile matrix set's bounding box for tile matrix: ${tileMatrix.identifier.code}`
      );
    }

    if (north < tileMatrixSetBoundingBoxMinNorth || north > tileMatrixSetBoundingBoxMaxNorth) {
      throw new RangeError(
        `point's northing, ${north}, is out of range of tile matrix set's bounding box for tile matrix: ${tileMatrix.identifier.code}`
      );
    }
  }
}

/**
 * Validates that the input `point` is valid with respect to `tileMatrix`
 * @param point point to validate
 * @param tileMatrix tile matrix to validate `point` against
 * @param coordRefSys CRS of `tileMatrix`
 */
export function validatePointByTileMatrix(point: Point, tileMatrix: TileMatrix, coordRefSys: TileMatrixSet['crs']): void {
  const {
    coordinates: [east, north],
  } = point;
  const {
    min: {
      coordinates: [tileMatrixBoundingBoxMinEast, tileMatrixBoundingBoxMinNorth],
    },
    max: {
      coordinates: [tileMatrixBoundingBoxMaxEast, tileMatrixBoundingBoxMaxNorth],
    },
  } = tileMatrixToBoundingBox(tileMatrix, coordRefSys);

  if (east < tileMatrixBoundingBoxMinEast || east > tileMatrixBoundingBoxMaxEast) {
    throw new RangeError(`point's easting, ${east}, is out of range of tile matrix bounding box`);
  }

  if (north < tileMatrixBoundingBoxMinNorth || north > tileMatrixBoundingBoxMaxNorth) {
    throw new RangeError(`point's northing, ${north}, is out of range of tile matrix bounding box`);
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
 * @param coordRefSys CRS of `tileMatrix`
 */
export function validateBoundingBoxByTileMatrix(boundingBox: BoundingBox, tileMatrix: TileMatrix, coordRefSys: TileMatrixSet['crs']): void {
  try {
    validatePointByTileMatrix(boundingBox.min, tileMatrix, coordRefSys);
    validatePointByTileMatrix(boundingBox.max, tileMatrix, coordRefSys);
  } catch (err) {
    throw new RangeError(`bounding box is not within the tile matrix`);
  }
}

/**
 * Validates that the input `geometry` is a valid with respect to `tileMatrixSet`
 * @param geometry geometry
 * @param tileMatrix tile matrix
 * @param coordRefSys CRS of `tileMatrix`
 */
export function validateGeometryByTileMatrix<G extends GeoJSONGeometry>(
  geometry: Geometry<G>,
  tileMatrix: TileMatrix,
  coordRefSys: TileMatrixSet['crs']
): void {
  const boundingBox = geometry.toBoundingBox();
  validateBoundingBoxByTileMatrix(boundingBox, tileMatrix, coordRefSys);
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
