/* eslint-disable @typescript-eslint/no-magic-numbers */
import { BoundingBox } from '../classes';
import { TileMatrixSet } from './classes/tileMatrixSet';
import { TILEMATRIXSETJSON_WORLD_CRS84_QUAD } from './tileMatrixSets/WorldCRS84Quad';
import { CoordinateReferenceSystem, Ellipsoid, ScaleSet, TileGrid } from './tiles_classes';

/**
 * Size of a pixel in meters
 */
export const PIXEL_SIZE = 0.00028;

/**
 * A scale factor between adjacent zoom levels
 */
export const SCALE_FACTOR = 2;

/**
 * @category Coordinate Reference System
 */
export const CRS_CRS84: CoordinateReferenceSystem = new CoordinateReferenceSystem(
  'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
  'WGS 84 longitude-latitude'
);

/**
 * @category Coordinate Reference System
 */
export const CRS_3857: CoordinateReferenceSystem = new CoordinateReferenceSystem(
  'http://www.opengis.net/def/crs/EPSG/0/3857',
  'WGS 84 / Pseudo-Mercator'
);

/**
 * @category Ellipsoid
 */
export const ELLIPSOID_WGS84: Ellipsoid = new Ellipsoid('WGS 84', 6378137, 298.257223563);

/**
 * scale denominators depend on a zoom level and are calculated as
 * zoom: ELLIPSOID_WGS84.semiMajorAxis * 2 * Math.PI / 256 / PIXEL_SIZE / 2**zoom
 * @category Scale Set
 */
export const SCALESET_GOOGLE_CRS84_QUAD: ScaleSet = new ScaleSet(
  'GoogleCRS84Quad',
  new Map([
    [0, 559082264.0287178],
    [1, 279541132.0143589],
    [2, 139770566.00717944],
    [3, 69885283.00358972],
    [4, 34942641.50179486],
    [5, 17471320.75089743],
    [6, 8735660.375448715],
    [7, 4367830.1877243575],
    [8, 2183915.0938621787],
    [9, 1091957.5469310894],
    [10, 545978.7734655447],
    [11, 272989.38673277234],
    [12, 136494.69336638617],
    [13, 68247.34668319309],
    [14, 34123.67334159654],
    [15, 17061.83667079827],
    [16, 8530.918335399136],
    [17, 4265.459167699568],
    [18, 2132.729583849784],
    [19, 1066.364791924892],
    [20, 533.182395962446],
    [21, 266.591197981223],
    [22, 133.2955989906115],
    [23, 66.64779949530575],
    [24, 33.323899747652874],
  ])
);

/**
 * scale denominators depend on a zoom level and are calculated as
 * zoom: ELLIPSOID_WGS84.semiMajorAxis * 2 * Math.PI / 256 / PIXEL_SIZE / 2**zoom
 * @category Scale Set
 */
export const SCALESET_GOOGLE_MAPS_COMPATIBLE: ScaleSet = new ScaleSet(
  'GoogleMapsCompatible',
  new Map([
    [0, 279541132.0143589],
    [1, 139770566.00717944],
    [2, 69885283.00358972],
    [3, 34942641.50179486],
    [4, 17471320.75089743],
    [5, 8735660.375448715],
    [6, 4367830.1877243575],
    [7, 2183915.0938621787],
    [8, 1091957.5469310894],
    [9, 545978.7734655447],
    [10, 272989.38673277234],
    [11, 136494.69336638617],
    [12, 68247.34668319309],
    [13, 34123.67334159654],
    [14, 17061.83667079827],
    [15, 8530.918335399136],
    [16, 4265.459167699568],
    [17, 2132.729583849784],
    [18, 1066.364791924892],
    [19, 533.182395962446],
    [20, 266.591197981223],
    [21, 133.2955989906115],
    [22, 66.64779949530575],
    [23, 33.323899747652874],
    [24, 16.661949873826437],
  ])
);

/**
 * scale denominators depend on a zoom level and are calculated as
 * zoom: ELLIPSOID_WGS84.semiMajorAxis * 2 * Math.PI / 256 / PIXEL_SIZE / 2**zoom
 * @notice WorldCRS84Quad uses modified version of GoogleCRS84Quad which dissmisses the first zoom level
 * @category Scale Set
 */
export const SCALESET_GOOGLE_CRS84_QUAD_MODIFIED: ScaleSet = new ScaleSet(
  'GoogleCRS84Quad',
  new Map([
    [0, 279541132.0143589],
    [1, 139770566.00717944],
    [2, 69885283.00358972],
    [3, 34942641.50179486],
    [4, 17471320.75089743],
    [5, 8735660.375448715],
    [6, 4367830.1877243575],
    [7, 2183915.0938621787],
    [8, 1091957.5469310894],
    [9, 545978.7734655447],
    [10, 272989.38673277234],
    [11, 136494.69336638617],
    [12, 68247.34668319309],
    [13, 34123.67334159654],
    [14, 17061.83667079827],
    [15, 8530.918335399136],
    [16, 4265.459167699568],
    [17, 2132.729583849784],
    [18, 1066.364791924892],
    [19, 533.182395962446],
    [20, 266.591197981223],
    [21, 133.2955989906115],
    [22, 66.64779949530575],
    [23, 33.323899747652874],
    [24, 16.661949873826437],
  ])
);

/**
 * some tile grid parameters are taken from https://docs.opengeospatial.org/is/17-083r2/17-083r2.html
 * @category Tile Grid
 */
export const TILEGRID_WORLD_CRS84: TileGrid = new TileGrid(
  'WorldCRS84Quad',
  'CRS84 for the World',
  new BoundingBox([-180, -90, 180, 90]),
  CRS_CRS84,
  SCALESET_GOOGLE_CRS84_QUAD_MODIFIED,
  2,
  1,
  256,
  256
);

/**
 * some tile grid parameters are taken from https://docs.opengeospatial.org/is/17-083r2/17-083r2.html
 * @category Tile Grid
 */
export const TILEGRID_WEB_MERCATOR: TileGrid = new TileGrid(
  'WebMercatorQuad',
  'Google Maps Compatible for the World',
  new BoundingBox([-180, -85.05112877980659, 180, 85.05112877980659]),
  CRS_3857,
  SCALESET_GOOGLE_MAPS_COMPATIBLE,
  1,
  1,
  256,
  256
);

/**
 * Tile Matrix Set World CRS84 Quad, This Tile Matrix Set defines tiles in the Equirectangular Plate Carrée projection in the CRS84 CRS for the whole world - https://docs.ogc.org/is/17-083r4/17-083r4.html#toc50
 * @category Tile Matrix Set
 */
export const TILEMATRIXSET_WORLD_CRS84_QUAD = new TileMatrixSet(TILEMATRIXSETJSON_WORLD_CRS84_QUAD);
