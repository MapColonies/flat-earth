import type { Position } from 'geojson';
import type { GeoJSONBaseGeometry, GeoJSONGeometry, GeoJSONGeometryCollection, GeometryCollectionInput } from './types';
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
    return this.geoJSONGeometry.geometries
      .flatMap((geometry) => this.flatGeometryCollection(geometry))
      .flatMap((geometry) => this.flatGeometryPositions(geometry));
  }

  private flatGeometryCollection(geoJSONGeometry: GeoJSONGeometry): GeoJSONBaseGeometry[] {
    return geoJSONGeometry.type === 'GeometryCollection'
      ? geoJSONGeometry.geometries.flatMap((geometry) => this.flatGeometryCollection(geometry))
      : [geoJSONGeometry];
  }
}
