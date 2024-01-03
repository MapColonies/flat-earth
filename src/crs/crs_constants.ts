import {CoordinateReferenceSystem} from './crs_classes';
import {BoundingBox} from '../classes';

export const CRS_CRS84: CoordinateReferenceSystem =
  new CoordinateReferenceSystem(
    'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
    'WGS 84 longitude-latitude',
    'EPSG:4326',
    new BoundingBox(-180, -90, 180, 90)
  );

export const CRS_3857: CoordinateReferenceSystem =
  new CoordinateReferenceSystem(
    'http://www.opengis.net/def/crs/EPSG/0/3857',
    'WGS 84 / Pseudo-Mercator',
    'EPSG:3857',
    new BoundingBox(-180, -85.05112877980659, 180, 85.05112877980659)
  );

export const CRS_32636: CoordinateReferenceSystem =
  new CoordinateReferenceSystem(
    'https://www.opengis.net/def/crs/EPSG/0/32636',
    'WGS 84 / UTM zone 36N',
    'EPSG:32636',
    new BoundingBox(0, 0, 42, 84) //todo: fix this
  );
