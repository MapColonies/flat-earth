import { BoundingBox, GeoPoint, type Geometry } from '../classes';
import { geometryToBoundingBox } from '../converters/geometry';
import { Tile } from '../tiles/tile';
import { TileMatrixSet } from '../tiles/tileMatrixSet';
import type { TileRange } from '../tiles/tileRange';
import { tileMatrixToBoundingBox } from '../tiles/tiles';
import type { TileMatrix } from '../tiles/types';
import type { ArrayElement, GeoJSONGeometry, TileMatrixId } from '../types';

/**
 * Validates that the input `boundingBox` is valid
 * @param boundingBox the bounding box to validate
 */
export function validateBoundingBox(boundingBox: BoundingBox): void {
  if (boundingBox.max.lon <= boundingBox.min.lon) {
    throw new Error("bounding box's max.lon must be larger than min.lon");
  }

  if (boundingBox.max.lat <= boundingBox.min.lat) {
    throw new Error("bounding box's max.lat must be larger than min.lat");
  }
}

/**
 * Validates that the input `geoPoint` is valid with respect to `tileMatrixSet`
 * @param geoPoint point with longitude and latitude to validate
 * @param tileMatrixSet tile matrix set to validate the `geoPoint` against
 */
export function validateGeoPointByTileMatrixSet(geoPoint: GeoPoint, tileMatrixSet: TileMatrixSet): void {
  const { tileMatrices } = tileMatrixSet;

  for (const tileMatrix of tileMatrices) {
    const { min: tileMatrixSetBoundingBoxMin, max: tileMatrixSetBoundingBoxMax } = tileMatrixToBoundingBox(tileMatrix);

    if (geoPoint.lon < tileMatrixSetBoundingBoxMin.lon || geoPoint.lon > tileMatrixSetBoundingBoxMax.lon) {
      throw new RangeError(
        `longitude ${geoPoint.lon} is out of range of tile matrix set's bounding box for tile matrix: ${tileMatrix.identifier.code}`
      );
    }

    if (geoPoint.lat < tileMatrixSetBoundingBoxMin.lat || geoPoint.lat > tileMatrixSetBoundingBoxMax.lat) {
      throw new RangeError(
        `latitude ${geoPoint.lat} is out of range of tile matrix set's bounding box for tile matrix: ${tileMatrix.identifier.code}`
      );
    }
  }
}

/**
 * Validates that the input `geoPoint` is valid with respect to `tileMatrix`
 * @param geoPoint a point with longitude and latitude to validate
 * @param tileMatrix the tile matrix to validate the `geoPoint` against
 */
export function validateGeoPointByTileMatrix(geoPoint: GeoPoint, tileMatrix: TileMatrix): void {
  const { min: tileMatrixBoundingBoxMin, max: tileMatrixBoundingBoxMax } = tileMatrixToBoundingBox(tileMatrix);

  if (geoPoint.lon < tileMatrixBoundingBoxMin.lon || geoPoint.lon > tileMatrixBoundingBoxMax.lon) {
    throw new RangeError(`longitude ${geoPoint.lon} is out of range of tile matrix bounding box`);
  }

  if (geoPoint.lat < tileMatrixBoundingBoxMin.lat || geoPoint.lat > tileMatrixBoundingBoxMax.lat) {
    throw new RangeError(`latitude ${geoPoint.lat} is out of range of tile matrix bounding box`);
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
  validateBoundingBox(boundingBox);

  try {
    validateGeoPointByTileMatrix(boundingBox.min, tileMatrix);
    validateGeoPointByTileMatrix(boundingBox.max, tileMatrix);
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
  const boundingBox = geometryToBoundingBox(geometry);
  validateBoundingBoxByTileMatrix(boundingBox, tileMatrix);
}

/**
 * Validates that the input `tile` is valid with respect to `tileMatrixSet`
 * @param tile tile to validate
 * @param tileMatrixSet tile matrix set to validate the `tile` against
 */
export function validateTileByTileMatrix<T extends TileMatrixSet>(tile: Tile<T>, tileMatrix: ArrayElement<T['tileMatrices']>): void {
  const { col, row, tileMatrixId, metatile } = tile;
  if (metatile !== undefined) {
    validateMetatile(metatile);
  }

  if (tileMatrixId !== tileMatrix.identifier.code) {
    throw new Error('tile identifier is not equal to the tile matrix identifier');
  }

  if (col < 0 || col >= tileMatrix.matrixWidth / (metatile ?? 1)) {
    throw new RangeError('tile matrix col index out of range of the tile matrix');
  }

  if (row < 0 || row >= tileMatrix.matrixHeight / (metatile ?? 1)) {
    throw new RangeError('tile matrix row index out of range of the tile matrix');
  }
}

/**
 * Validates that the input `tile` is valid with respect to `tileMatrixSet`
 * @param tile tile to validate
 * @param tileMatrixSet tile matrix set to validate the `tile` against
 */
export function validateTileByTileMatrixSet<T extends TileMatrixSet>(tile: Tile<T>, tileMatrixSet: T): void {
  const tileMatrix = tileMatrixSet.getTileMatrix(tile.tileMatrixId);

  if (!tileMatrix) {
    throw new Error('tile could not be found inside tile matrix set');
  }

  validateTileByTileMatrix(tile, tileMatrix);
}

/**
 * Validates that the input `tileMatrixId` is valid with respect to `tileMatrixSet`
 * @param tileMatrixId tile matrix id to validate
 * @param tileMatrixSet the tile matrix set to validate the `tileMatrixId` against
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
