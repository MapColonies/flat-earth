import type { GeoJSONPolygon, PolygonInput } from './types';
import { BaseGeometry } from './baseGeometry';

/**
 * Polygon geometry class
 */
export class Polygon extends BaseGeometry<GeoJSONPolygon> {
  /**
   * Polygon geometry constructor
   * @param polygon GeoJSON polygon and CRS
   */
  public constructor(polygon: PolygonInput) {
    super({ ...polygon, type: 'Polygon' });
  }
}
