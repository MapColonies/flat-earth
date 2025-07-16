import { Tile } from '../tiles/tile';
import type { TileEdgeInclusion, TileMatrixId, TileMatrixSet } from '../tiles/types';
import { positionToTileIndex } from '../tiles/utilities';
import { validateCRSByOtherCRS, validateMetatile, validateTileMatrixIdByTileMatrixSet } from '../validations';
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
   * @param tileEdgeInclusion behavior selection for tile edge inclusion (in cases that the position is on the edge of the (meta)tile)
   * @param metatile size of a metatile
   * @returns tile within the tile matrix
   */
  public toTile<T extends TileMatrixSet>(
    tileMatrixSet: T,
    tileMatrixId: TileMatrixId<T>,
    tileEdgeInclusion: TileEdgeInclusion,
    metatile = 1
  ): Tile<T> {
    validateMetatile(metatile);
    // validateTileMatrixSet(tileMatrixSet); // TODO: missing implementation
    validateCRSByOtherCRS(this.coordRefSys, tileMatrixSet.crs);
    validateTileMatrixIdByTileMatrixSet(tileMatrixId, tileMatrixSet);

    const { col, row } = positionToTileIndex(this.coordinates, tileMatrixSet, tileMatrixId, tileEdgeInclusion, metatile);
    return new Tile({ col, row, tileMatrixId }, tileMatrixSet, metatile);
  }
}
