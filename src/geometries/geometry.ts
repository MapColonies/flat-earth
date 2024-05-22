import type { BBox, Position } from 'geojson';
import { DEFAULT_CRS } from '../constants';
import { Tile } from '../tiles/tile';
import type { TileMatrixSet } from '../tiles/tileMatrixSet';
import { tileMatrixToBBox } from '../tiles/tiles';
import type { TileMatrixId } from '../tiles/types';
import type { ArrayElement, ConcreteCoordRefSys, CoordRefSys } from '../types';
import { validateCRS, validateMetatile } from '../validations/validations';
import type { GeoJSONBaseGeometry, GeoJSONGeometry, JSONFGFeature } from './types';
import { BoundingBox } from './boundingBox';

/**
 * Geometry class
 */
export abstract class Geometry<G extends GeoJSONGeometry> {
  /** CRS of the geometry */
  public readonly coordRefSys: ConcreteCoordRefSys['coordRefSys'];
  protected readonly bbox: BBox;
  protected readonly geoJSONGeometry: G;

  /**
   * Geometry constructor
   * @param geometry GeoJSON geometry
   */
  protected constructor(geometry: G & CoordRefSys) {
    this.bbox = this.calculateBBox();
    this.validateBBox();
    this.validateCRS(geometry.coordRefSys);
    this.geoJSONGeometry = geometry;
    this.coordRefSys = geometry.coordRefSys ?? DEFAULT_CRS; // Currently the default JSONFG CRS (in spec draft) doesn't match the CRS of WorldCRS84Quad tile matrix set
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
    if (this.coordRefSys === DEFAULT_CRS) {
      return { ...jsonFG, geometry: this.geoJSONGeometry };
    }
    return { ...jsonFG, place: this.geoJSONGeometry };
  }

  /**
   * Converts geometry to a bounding box
   * @returns bounding box of a geometry
   */
  public toBoundingBox(): BoundingBox {
    return new BoundingBox({
      bbox: this.bbox,
      coordRefSys: this.coordRefSys,
    });
  }

  /**
   * Find the minimal bounding tile containing the bounding box
   * @param tileMatrixSet tile matrix set for the containing tile lookup
   * @param tileMatrixId tile matrix identifier of `tileMatrixSet`
   * @param metatile size of a metatile
   * @returns tile that fully contains the bounding box in a single tile or null if it could not be fully contained in any tile
   */
  public minimalBoundingTile<T extends TileMatrixSet>(tileMatrixSet: T, tileMatrixId: TileMatrixId<T>, metatile = 1): Tile<T> | null {
    validateMetatile(metatile);
    validateCRS(this.coordRefSys, tileMatrixSet.crs);

    const boundingBox = this.toBoundingBox();

    const possibleBoundingTiles = tileMatrixSet.tileMatrices.map((tileMatrix) => {
      const tileMatrixBoundingBox = tileMatrixToBBox(tileMatrix);

      const [boundingBoxMinEast, boundingBoxMinNorth, boundingBoxMaxEast, boundingBoxMaxNorth] = boundingBox.bBox;
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
      const { minTileCol, minTileRow, maxTileCol, maxTileRow } = boundingBox.toTileRange(tileMatrixSet, tileMatrixId, metatile);
      const { scaleDenominator } = tileMatrix;

      if (minTileCol === maxTileCol && minTileRow === maxTileRow) {
        return { tile: new Tile(minTileCol, minTileRow, tileMatrixSet, tileMatrixId, metatile), scaleDenominator };
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

  private validateBBox(): void {
    const [minEast, minNorth, maxEast, maxNorth] = this.bbox;

    if (maxNorth < minNorth) {
      throw new Error('bounding box north bound must be equal or larger than south bound');
    }
  }

  private validateCRS(coordRefSys: CoordRefSys['coordRefSys']): void {
    // currently only the default CRS (OGC:CRS84) is supported
    if (coordRefSys !== DEFAULT_CRS) {
      throw new Error('unsupported CRS');
    }
  }

  private calculateBBox(): BBox {
    // we follow the same convention as turfjs & OpenLayers to return infinity bounds for empty geometry collection
    let [minEast, minNorth, maxEast, maxNorth] = [Infinity, Infinity, -Infinity, -Infinity];
    const positions = this.getPositions();

    for (const [east, north] of positions) {
      minEast = east < minEast ? east : minEast;
      minNorth = north < minNorth ? north : minNorth;
      maxEast = east > maxEast ? east : maxEast;
      maxNorth = north > maxNorth ? north : maxNorth;
    }

    return [minEast, minNorth, maxEast, maxNorth];
  }

  protected abstract getPositions(): Position[];
}
