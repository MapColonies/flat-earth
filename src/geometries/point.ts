import { Tile } from '../tiles/tile';
import type { TileMatrixSet } from '../tiles/tileMatrixSet';
import { tileEffectiveHeight, tileEffectiveWidth, tileMatrixToBBox } from '../tiles/tiles';
import type { TileMatrixId } from '../tiles/types';
import { validateCRSByOtherCRS, validateMetatile, validatePointByTileMatrix, validateTileMatrixIdByTileMatrixSet } from '../validations';
import { BaseGeometry } from './baseGeometry';
import type { GeoJSONPoint, PointInput } from './types';

/**
 * Point geometry class
 */
export class Point extends BaseGeometry<GeoJSONPoint> {
  /**
   * Point geometry constructor
   * @param point GeoJSON point and CRS
   */
  public constructor(point: PointInput) {
    super({ ...point, type: 'Point' });
  }

  /**
   * Calculates a tile for east, north and tile matrix
   * @param tileMatrixSet tile matrix set which the calculated tile belongs to
   * @param tileMatrixId tile matrix identifier of `tileMatrixSet`
   * @param reverseIntersectionPolicy boolean value whether to reverse the intersection policy (in cases that the location is on the edge of the tile)
   * @param metatile size of a metatile
   * @returns tile within the tile matrix
   */
  public toTile<T extends TileMatrixSet>(tileMatrixSet: T, tileMatrixId: TileMatrixId<T>, reverseIntersectionPolicy: boolean, metatile = 1): Tile<T> {
    validateMetatile(metatile);
    // validateTileMatrixSet(tileMatrixSet); // TODO: missing implementation
    validateCRSByOtherCRS(this.coordRefSys, tileMatrixSet.crs);
    validateTileMatrixIdByTileMatrixSet(tileMatrixId, tileMatrixSet);

    const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }

    validatePointByTileMatrix(this, tileMatrix);

    const [east, north] = this.coordinates;

    const width = tileEffectiveWidth(tileMatrix) * metatile;
    const height = tileEffectiveHeight(tileMatrix) * metatile;

    const [tileMatrixBoundingBoxMinEast, tileMatrixBoundingBoxMinNorth, tileMatrixBoundingBoxMaxEast, tileMatrixBoundingBoxMaxNorth] =
      tileMatrixToBBox(tileMatrix);
    const { cornerOfOrigin = 'topLeft' } = tileMatrix;

    const tempTileCol = (east - tileMatrixBoundingBoxMinEast) / width;
    const tempTileRow = (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMaxNorth - north : north - tileMatrixBoundingBoxMinNorth) / height;

    // when explicitly asked to reverse the intersection policy (location on the edge of the tile)
    if (reverseIntersectionPolicy) {
      const onEdgeEastTranslation = east === tileMatrixBoundingBoxMinEast ? 1 : 0;
      const onEdgeNorthTranslation = north === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMaxNorth : tileMatrixBoundingBoxMinNorth) ? 1 : 0;

      const tileCol = Math.ceil(tempTileCol) - 1 + onEdgeEastTranslation;
      const tileRow = Math.ceil(tempTileRow) - 1 + onEdgeNorthTranslation;

      return new Tile({ col: tileCol, row: tileRow, tileMatrixId }, tileMatrixSet, metatile);
    }

    // when east/north is on the maximum edge of the tile matrix (e.g. lon = 180 lat = 90 in wgs84)
    const onEdgeEastTranslation = east === tileMatrixBoundingBoxMaxEast ? 1 : 0;
    const onEdgeNorthTranslation = north === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMinNorth : tileMatrixBoundingBoxMaxNorth) ? 1 : 0;

    const tileCol = Math.floor(tempTileCol) - onEdgeEastTranslation;
    const tileRow = Math.floor(tempTileRow) - onEdgeNorthTranslation;

    return new Tile({ col: tileCol, row: tileRow, tileMatrixId }, tileMatrixSet, metatile);
  }
}
