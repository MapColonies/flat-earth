import { TileMatrixCollection } from './tileMatrixCollection';
import { TILEMATRIXSETJSON_WEB_MERCATOR_QUAD } from './tileMatrixSets/webMercatorQuad';
import { TILEMATRIXSETJSON_WORLD_CRS84_QUAD } from './tileMatrixSets/worldCRS84Quad';

export const CORNER_OF_ORIGIN_CODE = ['topLeft', 'bottomLeft'] as const;

/**
 * Tile Matrix Collection World CRS84 Quad, This Tile Matrix Collection defines tiles in the Equirectangular Plate Carrée projection in the CRS84 CRS for the whole world - https://docs.ogc.org/is/17-083r4/17-083r4.html#toc50
 */
export const TILEMATRIXCOLLECTION_WORLD_CRS84_QUAD = new TileMatrixCollection(TILEMATRIXSETJSON_WORLD_CRS84_QUAD);

/**
 * Tile Matrix Collection Web Mercator Quad, This Tile Matrix Collection defines tiles based on a spherical Mercator instead of an ellipsoid - https://docs.ogc.org/is/17-083r4/17-083r4.html#toc49
 */
export const TILEMATRIXCOLLECTION_WEB_MERCATOR_QUAD = new TileMatrixCollection(TILEMATRIXSETJSON_WEB_MERCATOR_QUAD);
