import type { Position } from 'geojson';
import type { GeoJSONGeometryCollection, GeometryCollectionInput } from '../types';
import { flatGeometryCollection, flattenGeometryPositions } from '../utilities';
import { Geometry } from './geometry';

/**
 * Geometry collection class
 */
export class GeometryCollection extends Geometry<GeoJSONGeometryCollection> {
  /**
   * Geometry collection constructor
   * @param geometryCollection GeoJSON geometry collection and CRS
   */
  public constructor(geometryCollection: GeometryCollectionInput) {
    super({ ...geometryCollection, type: 'GeometryCollection' });
  }

  /**
   * Gets GeoJSON geometries contained inside the geometry collection
   */
  public get geometries(): GeoJSONGeometryCollection['geometries'] {
    return this.geoJSONGeometry.geometries;
  }

  protected getPositions(): Position[] {
    return this.geoJSONGeometry.geometries.flatMap(flatGeometryCollection).flatMap(flattenGeometryPositions);
  }
}
