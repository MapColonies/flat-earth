import type {
  BBox,
  GeometryCollection as GeoJSONGeometryCollection,
  LineString as GeoJSONLineString,
  Point as GeoJSONPoint,
  Polygon as GeoJSONPolygon,
  Position,
} from 'geojson';
import { geometryToTurfBbox } from './converters/turf';
import { Tile } from './tiles/tile';
import type { TileMatrixSet } from './tiles/tileMatrixSet';
import { TileRange } from './tiles/tileRange';
import { avoidNegativeZero, tileEffectiveHeight, tileEffectiveWidth, tileMatrixToBoundingBox } from './tiles/tiles';
import type { TileMatrix } from './tiles/types';
import type { ArrayElement, GeoJSONBaseGeometry, GeoJSONGeometry, Latitude, Longitude } from './types';
import { validateBoundingBoxByTileMatrix, validateGeoPointByTileMatrix, validateMetatile, validateTileMatrix } from './validations/validations';

export abstract class Geometry<G extends GeoJSONGeometry> {
  protected constructor(public readonly type: G['type']) {
    this.validateBoundingBox();
  }

  /**
   * Calculates the bounding box of a geometry
   */
  public toBoundingBox(): BoundingBox {
    const bbox = geometryToTurfBbox(this);
    return new BoundingBox(bbox);
  }

  private validateBoundingBox(): void {
    const [minLon, minLat, maxLon, maxLat] = geometryToTurfBbox(this);

    [minLon, maxLon].forEach((lon) => {
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      if (lon < -180 || lon > 180) {
        throw new RangeError('geometry longitude must be between -180 and 180');
      }
    });

    [minLat, maxLat].forEach((lat) => {
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      if (lat < -90 || lat > 90) {
        throw new RangeError('geometry latitude must be between -90 and 90');
      }
    });

    if (maxLat < minLat) {
      throw new Error("geometry bounding box's minimum latitude must be equal or lower than the maximum latitude");
    }

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    if (maxLon - minLon > 360) {
      throw new Error("geometry bounding box's longitude bounds size must be less than 360");
    }
  }

  public abstract getGeoJSON(): G;
}

export abstract class BaseGeometry<G extends GeoJSONBaseGeometry> extends Geometry<G> {
  public constructor(private readonly geometry: G) {
    super(geometry.type);
  }

  public get coordinates(): G['coordinates'] {
    return this.geometry.coordinates;
  }

  public getGeoJSON(): G {
    return this.geometry;
  }
}

export class GeometryCollection extends Geometry<GeoJSONGeometryCollection> {
  public constructor(public readonly geometries: GeoJSONGeometry[]) {
    super('GeometryCollection');
  }

  public getGeoJSON(): GeoJSONGeometryCollection {
    return {
      type: this.type,
      geometries: this.geometries,
    };
  }
}

/**
 * A polygon is an area defined by a closed ring of points.
 * The first and last points of a ring must be the same.
 * Points must be ordered counterclockwise.
 */
export class Polygon extends BaseGeometry<GeoJSONPolygon> {
  public constructor(coordinates: Position[][] = []) {
    super({ type: 'Polygon', coordinates });
  }
}

export class Line extends BaseGeometry<GeoJSONLineString> {
  public constructor(coordinates: Position[] = []) {
    super({ type: 'LineString', coordinates });
  }
}

export class Point extends BaseGeometry<GeoJSONPoint> {
  public constructor(coordinates: Position) {
    super({ type: 'Point', coordinates });
  }
}

export class BoundingBox extends Polygon {
  public readonly min: GeoPoint;
  public readonly max: GeoPoint;

  public constructor([minX, minY, maxX, maxY]: BBox) {
    super([
      [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY],
      ],
    ]);

    this.min = new GeoPoint(minX, minY);
    this.max = new GeoPoint(maxX, maxY);
  }

  /**
   * Expands bounding box to the containing tile matrix
   * @param tileMatrix tile matrix
   * @returns bounding box that contains the input `boundingBox` snapped to the tile matrix tiles
   */
  public expandToTileMatrixCells(tileMatrix: TileMatrix): BoundingBox {
    validateTileMatrix(tileMatrix);
    validateBoundingBoxByTileMatrix(this, tileMatrix);

    const minPoint = this.snapMinPointToTileMatrixCell(tileMatrix);
    const maxPoint = this.snapMaxPointToTileMatrixCell(tileMatrix);

    return new BoundingBox([minPoint.lon, minPoint.lat, maxPoint.lon, maxPoint.lat]);
  }

  /**
   * Calculates tile range that covers the bounding box
   * @param tileMatrix tile matrix
   * @param metatile size of a metatile
   * @returns tile range that covers the `boundingBox`
   */
  public toTileRange<T extends TileMatrixSet>(tileMatrix: ArrayElement<T['tileMatrices']>, metatile = 1): TileRange<T> {
    validateMetatile(metatile);
    validateTileMatrix(tileMatrix);
    validateBoundingBoxByTileMatrix(this, tileMatrix);

    const { cornerOfOrigin = 'topLeft' } = tileMatrix;

    const minTilePoint = new GeoPoint(this.min.lon, cornerOfOrigin === 'topLeft' ? this.max.lat : this.min.lat);
    const maxTilePoint = new GeoPoint(this.max.lon, cornerOfOrigin === 'topLeft' ? this.min.lat : this.max.lat);

    const { col: minTileCol, row: minTileRow } = minTilePoint.toTile(tileMatrix, false, metatile);
    const { col: maxTileCol, row: maxTileRow } = maxTilePoint.toTile(tileMatrix, true, metatile);

    return new TileRange(minTileCol, minTileRow, maxTileCol, maxTileRow, tileMatrix.identifier.code, metatile);
  }

  private snapMinPointToTileMatrixCell(tileMatrix: TileMatrix): GeoPoint {
    const width = tileEffectiveWidth(tileMatrix);
    const minLon = Math.floor(this.min.lon / width) * width;
    const height = tileEffectiveHeight(tileMatrix);
    const minLat = Math.floor(this.min.lat / height) * height;
    return new GeoPoint(avoidNegativeZero(minLon), avoidNegativeZero(minLat));
  }

  private snapMaxPointToTileMatrixCell(tileMatrix: TileMatrix): GeoPoint {
    const width = tileEffectiveWidth(tileMatrix);
    const maxLon = Math.ceil(this.max.lon / width) * width;
    const height = tileEffectiveHeight(tileMatrix);
    const maxLat = Math.ceil(this.max.lat / height) * height;
    return new GeoPoint(avoidNegativeZero(maxLon), avoidNegativeZero(maxLat));
  }
}

export class GeoPoint {
  public constructor(
    public readonly lon: Longitude,
    public readonly lat: Latitude
  ) {}

  /**
   * Calculates a tile for longitude, latitude and tile matrix
   * @param tileMatrix tile matrix which the calculated tile belongs to
   * @param reverseIntersectionPolicy boolean value whether to reverse the intersection policy (in cases that the location is on the edge of the tile)
   * @param metatile size of a metatile
   * @returns tile within the tile matrix
   */
  public toTile<T extends TileMatrixSet>(tileMatrix: ArrayElement<T['tileMatrices']>, reverseIntersectionPolicy: boolean, metatile = 1): Tile<T> {
    validateMetatile(metatile);
    validateTileMatrix(tileMatrix);
    validateGeoPointByTileMatrix(this, tileMatrix);

    const width = tileEffectiveWidth(tileMatrix) * metatile;
    const height = tileEffectiveHeight(tileMatrix) * metatile;

    const { min: tileMatrixBoundingBoxMin, max: tileMatrixBoundingBoxMax } = tileMatrixToBoundingBox(tileMatrix);

    const { cornerOfOrigin = 'topLeft' } = tileMatrix;

    const x = (this.lon - tileMatrixBoundingBoxMin.lon) / width;
    const y = (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMax.lat - this.lat : this.lat - tileMatrixBoundingBoxMin.lat) / height;

    // When explicitly asked to reverse the intersection policy (location on the edge of the tile)
    if (reverseIntersectionPolicy) {
      const tileCol = Math.ceil(x) - 1;
      const tileRow = Math.ceil(y) - 1;
      return new Tile(tileCol, tileRow, tileMatrix, metatile);
    }

    // When longitude/latitude is on the maximum edge of the tile matrix (e.g. lon = 180 lat = 90)
    const onEdgeXTranslation = this.lon === tileMatrixBoundingBoxMax.lon ? 1 : 0;
    const onEdgeYTranslation = this.lat === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMin.lat : tileMatrixBoundingBoxMax.lat) ? 1 : 0;

    const tileCol = Math.floor(x) - onEdgeXTranslation;
    const tileRow = Math.floor(y) - onEdgeYTranslation;

    return new Tile(tileCol, tileRow, tileMatrix, metatile);
  }
}
