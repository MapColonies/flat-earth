import { GeoPoint } from '../classes';
import { TileGrid } from './tiles_classes';

/**
 * Check if the given location is on the edge of the tile grid
 * @param geoPoint
 * @param referenceTileGrid
 */
export function isPointOnEdgeOfTileGrid(geoPoint: GeoPoint, referenceTileGrid: TileGrid): boolean {
  return geoPoint.lon === referenceTileGrid.boundingBox.max.lon || geoPoint.lat === referenceTileGrid.boundingBox.min.lat;
}
