import type { Position } from 'geojson';
import type { GeoJSONBaseGeometry, GeoJSONGeometry } from './types';

export const flatGeometryCollection = (geoJSONGeometry: GeoJSONGeometry): GeoJSONBaseGeometry[] => {
  return geoJSONGeometry.type === 'GeometryCollection' ? geoJSONGeometry.geometries.flatMap(flatGeometryCollection) : [geoJSONGeometry];
};

export const flattenGeometryPositions = (geometry: GeoJSONBaseGeometry): Position[] => {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates];
    case 'LineString':
      return geometry.coordinates;
    case 'Polygon':
      return geometry.coordinates.flat();
    case 'MultiPoint':
    case 'MultiLineString':
    case 'MultiPolygon':
      throw new Error('multi geometries are currently not supported');
  }
};
