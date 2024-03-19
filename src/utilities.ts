import type { GeoJSONBaseGeometry, GeoJSONGeometry } from './types';

export const flatGeometryCollection = (v: GeoJSONGeometry): GeoJSONBaseGeometry => {
  return v.type === 'GeometryCollection' ? flatGeometryCollection(v) : v;
};
