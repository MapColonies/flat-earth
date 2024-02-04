import { SCALE_FACTOR } from '../tiles/tiles_constants';

import { Zoom } from '../types';
import { ScaleSet, Tile, TileGrid } from '../tiles/tiles_classes';
import { BoundingBox, GeoPoint } from '../classes';

/**
 * Validates that the input `scaleSet` is valid
 * @param scaleSet the scale set to validate
 */
export function validateScaleSet(scaleSet: ScaleSet): void {
  const arr = [...scaleSet.scaleDenominators.entries()];
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i][0] + 1 !== arr[i + 1][0]) {
      throw new Error("scale set must have it's zoom levels ordered in ascending order and must be larger then the previous by 1");
    }

    if (arr[i][1] <= arr[i + 1][1]) {
      throw new Error("scale set must have it's scales ordered in ascending order and must be larger then the previous");
    }
  }
}

/**
 * Validates that the input `tileGrid` is valid
 * @param tileGrid the tile grid to validate
 */
export function validateTileGrid(tileGrid: TileGrid): void {
  validateBoundingBox(tileGrid.boundingBox);
  validateScaleSet(tileGrid.wellKnownScaleSet);

  if (tileGrid.numberOfMinLevelTilesX < 1) {
    throw new Error('number of tiles on the x axis of a tile grid at the min zoom level must be at least 1');
  }

  if (tileGrid.numberOfMinLevelTilesY < 1) {
    throw new Error('number of tiles on the y axis of a tile grid at the min zoom level must be at least 1');
  }

  if (tileGrid.tileWidth < 1) {
    throw new Error('tile width of a tile grid must be at least 1');
  }

  if (tileGrid.tileHeight < 1) {
    throw new Error('tile height of a tile grid must be at least 1');
  }
}

/**
 * Validates that the input `bbox` is valid
 * @param bbox the bounding box to validate
 */
export function validateBoundingBox(bbox: BoundingBox): void {
  if (bbox.max.lon <= bbox.min.lon) {
    throw new Error("bounding box's max.lon must be larger than min.lon");
  }

  if (bbox.max.lat <= bbox.min.lat) {
    throw new Error("bounding box's max.lat must be larger than min.lat");
  }
}

/**
 * Validates that the input `bbox` is a valid bounding box inside the tile grid's bounding box
 * @param bbox the bounding box to validate
 * @param referenceTileGrid the tile grid to validate the `bbox` against its own bounding box
 */
export function validateBboxByGrid(bbox: BoundingBox, referenceTileGrid: TileGrid): void {
  validateBoundingBox(bbox);

  validateGeoPoint(bbox.min, referenceTileGrid);
  validateGeoPoint(bbox.max, referenceTileGrid);
}

/**
 * Validates that the input `geoPoint` is valid
 * @param geoPoint the longtitude and latitudes to validate
 * @param referenceTileGrid the tile grid to validate the `geoPoint` against
 */
export function validateGeoPoint(geoPoint: GeoPoint, referenceTileGrid: TileGrid): void {
  if (geoPoint.lon < referenceTileGrid.boundingBox.min.lon || geoPoint.lon > referenceTileGrid.boundingBox.max.lon) {
    throw new RangeError(`longitude ${geoPoint.lon} is out of range of tile grid's bounding box`);
  }

  if (geoPoint.lat < referenceTileGrid.boundingBox.min.lat || geoPoint.lat > referenceTileGrid.boundingBox.max.lat) {
    throw new RangeError(`latitude ${geoPoint.lat} is out of range of tile grid's bounding box`);
  }
}

/**
 * Validates that the input `zoom` is valid
 * @param zoom the zoom level to validate
 * @param referenceTileGrid the tile grid to validate the `zoom` against
 */
export function validateZoomByGrid(zoom: Zoom, referenceTileGrid: TileGrid): void {
  if (!referenceTileGrid.wellKnownScaleSet.scaleDenominators.has(zoom)) {
    throw new Error('zoom level is not part of the given well known scale set');
  }
}

/**
 * Validates that the input `tile` is valid
 * @param tile the tile to validate
 * @param referenceTileGrid the tile grid to validate the `tile` against
 */
export function validateTileByGrid(tile: Tile, referenceTileGrid: TileGrid): void {
  validateZoomByGrid(tile.z, referenceTileGrid);
  if (tile.metatile !== undefined) {
    validateMetatile(tile.metatile);
  }

  if (tile.x < 0 || tile.x >= (referenceTileGrid.numberOfMinLevelTilesX / (tile.metatile ?? 1)) * SCALE_FACTOR ** tile.z) {
    throw new RangeError('x index out of range of tile grid');
  }

  if (tile.y < 0 || tile.y >= (referenceTileGrid.numberOfMinLevelTilesY / (tile.metatile ?? 1)) * SCALE_FACTOR ** tile.z) {
    throw new RangeError('y index out of range of tile grid');
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
