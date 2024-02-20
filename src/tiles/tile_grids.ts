import { GeoPoint } from '../classes';
import { TileGrid } from './tiles_classes';

/**
 * Check if the given location is on the edge of the tile grid
 * @param geoPoint point to check
 * @param referenceTileGrid tile grid to check against
 * @returns true/false if the `geoPoint` lies on tile grid's edge
 */
export function isPointOnEdgeOfTileGrid(geoPoint: GeoPoint, referenceTileGrid: TileGrid): boolean {
  return geoPoint.lon === referenceTileGrid.boundingBox.max.lon || geoPoint.lat === referenceTileGrid.boundingBox.min.lat;
}
