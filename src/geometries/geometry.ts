import type { BBox, Position } from 'geojson';
import { DEFAULT_CRS } from '../constants';
import { decodeFromJSON, encodeToJSON } from '../crs/crs';
import type { TileMatrixSet } from '../tiles/tileMatrixSet';
import { positionToTileIndex, tileMatrixToBBox } from '../tiles/tiles';
import type { CRS as CRSType, TileIndex } from '../tiles/types';
import type { ArrayElement } from '../utils/types';
import { validateCRS, validateCRSByOtherCRS, validateMetatile } from '../validations/validations';
import type { CoordRefSysJSON, GeoJSONBaseGeometry, GeoJSONGeometry, JSONFGFeature } from './types';

/**
 * Geometry class
 */
export abstract class Geometry<G extends GeoJSONGeometry> {
  /** GeoJSON bounding box (BBox) */
  public readonly bBox: BBox;
  /** CRS of the geometry */
  public readonly coordRefSys: CRSType;
  protected readonly geoJSONGeometry: G;

  /**
   * Geometry constructor
   * @param geometry GeoJSON geometry
   */
  protected constructor(geometry: G & CoordRefSysJSON) {
    this.geoJSONGeometry = geometry;
    this.bBox = this.calculateBBox();
    validateCRS(geometry.coordRefSys);
    this.coordRefSys = decodeFromJSON(geometry.coordRefSys ?? DEFAULT_CRS); // Currently the default JSONFG CRS (in spec draft) doesn't match the CRS of WorldCRS84Quad tile matrix set
  }

  /**
   * Gets the "type" property of GeoJSON geometry objects
   */
  public get type(): G['type'] {
    return this.geoJSONGeometry.type;
  }

  /**
   * Gets the OGC features and geometries JSON (JSON-FG) of the geometry
   * @returns JSON-FG feature representation of the geometry
   */
  public getJSONFG(): JSONFGFeature<G | null, G | null, G> {
    const jsonFG: JSONFGFeature<null, null, GeoJSONBaseGeometry> = {
      type: 'Feature',
      time: null,
      place: null,
      geometry: null,
      properties: null,
    };
    if (encodeToJSON(this.coordRefSys) === DEFAULT_CRS) {
      return { ...jsonFG, geometry: this.geoJSONGeometry };
    }
    return { ...jsonFG, place: this.geoJSONGeometry };
  }

  /**
   * Find the tile index of minimal bounding tile containing the bounding box
   * @param tileMatrixSet tile matrix set for the containing tile lookup
   * @param metatile size of a metatile
   * @returns tile index of a tile that fully contains the bounding box in a single tile or null if it could not be fully contained in any tile
   */
  public minimalBoundingTileIndex<T extends TileMatrixSet>(tileMatrixSet: T, metatile = 1): TileIndex<T> | null {
    validateMetatile(metatile);
    validateCRSByOtherCRS(this.coordRefSys, tileMatrixSet.crs);

    const possibleBoundingTiles = tileMatrixSet.tileMatrices.map((tileMatrix) => {
      const tileMatrixBoundingBox = tileMatrixToBBox(tileMatrix);

      const [boundingBoxMinEast, boundingBoxMinNorth, boundingBoxMaxEast, boundingBoxMaxNorth] = this.bBox;
      const [tileMatrixBoundingBoxMinEast, tileMatrixBoundingBoxMinNorth, tileMatrixBoundingBoxMaxEast, tileMatrixBoundingBoxMaxNorth] =
        tileMatrixBoundingBox;

      if (
        boundingBoxMinEast < tileMatrixBoundingBoxMinEast ||
        boundingBoxMinNorth < tileMatrixBoundingBoxMinNorth ||
        boundingBoxMaxEast > tileMatrixBoundingBoxMaxEast ||
        boundingBoxMaxNorth > tileMatrixBoundingBoxMaxNorth
      ) {
        return null;
      }

      const {
        cornerOfOrigin = 'topLeft',
        identifier: { code: tileMatrixId },
      } = tileMatrix;

      const { col: minTileCol, row: minTileRow } = positionToTileIndex(
        [boundingBoxMinEast, cornerOfOrigin === 'topLeft' ? boundingBoxMaxNorth : boundingBoxMinNorth],
        tileMatrixSet,
        tileMatrixId,
        'none',
        metatile
      );
      const { col: maxTileCol, row: maxTileRow } = positionToTileIndex(
        [boundingBoxMaxEast, cornerOfOrigin === 'topLeft' ? boundingBoxMinNorth : boundingBoxMaxNorth],
        tileMatrixSet,
        tileMatrixId,
        'none',
        metatile
      );
      const { scaleDenominator } = tileMatrix;

      if (minTileCol === maxTileCol && minTileRow === maxTileRow) {
        return { tile: { col: minTileCol, row: minTileRow, tileMatrixId }, scaleDenominator };
      }

      return null;
    });

    const boundingTiles = possibleBoundingTiles.filter(
      <T extends ArrayElement<typeof possibleBoundingTiles>>(value: T): value is NonNullable<T> => value !== null
    );

    if (boundingTiles.length === 0) {
      return null;
    }

    const { tile } = boundingTiles.reduce((prevPossibleBoundingTile, possibleBoundingTile) => {
      return possibleBoundingTile.scaleDenominator < prevPossibleBoundingTile.scaleDenominator ? possibleBoundingTile : prevPossibleBoundingTile;
    });

    return tile;
  }

  protected flatGeometryPositions(geometry: GeoJSONBaseGeometry): Position[] {
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
  }

  private validatePositions(positions: Position[]): void {
    positions.flat().forEach((value) => {
      if (!Number.isFinite(value)) {
        throw new Error("geometry's positions must consist of finite numbers that are neither infinite nor NaN");
      }
    });
  }

  private calculateBBox(): BBox {
    // we follow the same convention as turfjs & OpenLayers to return infinity bounds for empty geometry collection
    let [minEast, minNorth, maxEast, maxNorth] = [Infinity, Infinity, -Infinity, -Infinity];
    const positions = this.getAllPositions();
    this.validatePositions(positions);

    for (const [east, north] of positions) {
      minEast = east < minEast ? east : minEast;
      minNorth = north < minNorth ? north : minNorth;
      maxEast = east > maxEast ? east : maxEast;
      maxNorth = north > maxNorth ? north : maxNorth;
    }

    return [minEast, minNorth, maxEast, maxNorth];
  }

  protected abstract getAllPositions(): Position[];
}
