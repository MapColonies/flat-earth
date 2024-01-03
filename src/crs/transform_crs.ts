import {LonLat} from '../classes';
import {CoordinateReferenceSystem} from './crs_classes';
import {validateLonlatByCrs} from '../validations/validations';
import * as proj4 from 'proj4';
import {InterfaceProjection} from 'proj4';

const projections: Map<string, InterfaceProjection> = new Map<
  string,
  InterfaceProjection
>();
export function transformCrs(
  lonlat: LonLat,
  sourceCrs: CoordinateReferenceSystem,
  targetCrs: CoordinateReferenceSystem
): LonLat {
  if (sourceCrs === targetCrs) {
    return lonlat;
  }

  validateLonlatByCrs(lonlat, sourceCrs);
  const sourceProj = getProjection(sourceCrs);
  const targetProj = getProjection(targetCrs);
  const point = proj4.toPoint([lonlat.lon, lonlat.lat]);
  proj4.transform(sourceProj, targetProj, point);

  return new LonLat(point.x, point.y);
}

function getProjection(crs: CoordinateReferenceSystem) {
  let projection = projections.get(crs.epsg);
  if (projection === undefined) {
    projection = proj4.Proj(crs.epsg);
    projections.set(crs.epsg, projection);
  }
  return projection;
}
