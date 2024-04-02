import { TileMatrixSet } from './tileMatrixSet';
import { TILEMATRIXSETJSON_WEB_MERCATOR_QUAD } from './tileMatrixSets/webMercatorQuad';
import { TILEMATRIXSETJSON_WORLD_CRS84_QUAD } from './tileMatrixSets/worldCRS84Quad';

export const cornerOfOriginCode = ['topLeft', 'bottomLeft'] as const;

/**
 * Tile Matrix Set World CRS84 Quad, This Tile Matrix Set defines tiles in the Equirectangular Plate Carrée projection in the CRS84 CRS for the whole world - https://docs.ogc.org/is/17-083r4/17-083r4.html#toc50
 * @category Tile Matrix Set
 */
export const TILEMATRIXSET_WORLD_CRS84_QUAD = new TileMatrixSet(TILEMATRIXSETJSON_WORLD_CRS84_QUAD);

/**
 * Tile Matrix Set Web Mercator Quad, This Tile Matrix Set defines tiles based on a spherical Mercator instead of an ellipsoid - https://docs.ogc.org/is/17-083r4/17-083r4.html#toc49
 * @category Tile Matrix Set
 */
export const TILEMATRIXSET_WEB_MERCATOR_QUAD = new TileMatrixSet(TILEMATRIXSETJSON_WEB_MERCATOR_QUAD);
