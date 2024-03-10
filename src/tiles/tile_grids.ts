import { GeoPoint } from '../classes';
import { TileGrid } from './tiles_classes';

/**
 * Check if the given location is on the maximum edge of the tile grid
 * @param geoPoint point to check
 * @param referenceTileGrid tile grid to check against
 * @returns if the `geoPoint` lies on tile grid's edge then the corresponding axis is returned ('X' | 'Y' | 'XY'), undefined otherwise
 */
export function isPointOnEdgeOfTileGrid(geoPoint: GeoPoint, referenceTileGrid: TileGrid): 'X' | 'Y' | 'XY' | undefined {
  const isPointOnXEdge = geoPoint.lon === referenceTileGrid.boundingBox.max.lon;
  const isPointonYEdge = geoPoint.lat === referenceTileGrid.boundingBox.min.lat;
  if (isPointOnXEdge && isPointonYEdge) {
    return 'XY';
  } else if (isPointOnXEdge) {
    return 'X';
  } else if (isPointonYEdge) {
    return 'Y';
  }
  return;
}
