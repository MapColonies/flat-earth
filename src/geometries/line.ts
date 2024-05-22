import type { GeoJSONLineString, LineStringInput } from '../types';
import { BaseGeometry } from './baseGeometry';

/**
 * Line geometry class
 */
export class Line extends BaseGeometry<GeoJSONLineString> {
  /**
   * Line geometry constructor
   * @param lineString GeoJSON linestring and CRS
   */
  public constructor(lineString: LineStringInput) {
    super({ ...lineString, type: 'LineString' });
  }
}
