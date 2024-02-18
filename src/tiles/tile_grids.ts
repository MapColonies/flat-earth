import { GeoPoint } from '../classes';
import { TileGrid } from './tiles_classes';

/**
 * Check if the given location is on the edge of the tile grid
 * @param lonlat
 * @param referenceTileGrid
 */
export function isPointOnEdgeOfTileGrid(lonlat: GeoPoint, referenceTileGrid: TileGrid): boolean {
  return lonlat.lon === referenceTileGrid.boundingBox.max.lon || lonlat.lat === referenceTileGrid.boundingBox.min.lat;
}
