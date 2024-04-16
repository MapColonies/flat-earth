import type { BBox, Position } from 'geojson';
import { Tile } from './tiles/tile';
import type { TileMatrixSet } from './tiles/tileMatrixSet';
import { TileRange } from './tiles/tileRange';
import { avoidNegativeZero, clampValues, tileEffectiveHeight, tileEffectiveWidth, tileMatrixToBoundingBox } from './tiles/tiles';
import type { TileMatrix, TileMatrixId } from './tiles/types';
import type {
  BoundingBoxInput,
  GeoJSONBaseGeometry,
  GeoJSONGeometry,
  GeoJSONGeometryCollection,
  GeoJSONLineString,
  GeoJSONPoint,
  GeoJSONPolygon,
  JSONFG,
  LineStringInput,
  PointInput,
  PolygonInput,
} from './types';
import { flatGeometryCollection, flattenGeometryPositions } from './utilities';
import {
  validateBoundingBoxByTileMatrix,
  validateMetatile,
  validatePointByTileMatrix,
  validateTileMatrixIdByTileMatrixSet,
} from './validations/validations';

export abstract class Geometry<G extends GeoJSONGeometry, FG extends JSONFG = JSONFG> {
  public readonly coordRefSys: FG['coordRefSys'];
  private readonly bbox: BBox;

  protected constructor(protected readonly geoJSONGeometry: G & FG) {
    this.bbox = this.calculateBBox();
    this.validateBBox();
    this.coordRefSys = geoJSONGeometry.coordRefSys;
  }

  public get type(): G['type'] {
    return this.geoJSONGeometry.type;
  }

  /**
   * Bounding box of a geometry
   * @returns bounding box of a geometry
   */
  public toBoundingBox(): BoundingBox {
    return new BoundingBox({
      bbox: this.bbox,
      coordRefSys: this.coordRefSys,
    });
  }

  public getJSONFG(): G & FG {
    return this.geoJSONGeometry;
  }

  // TODO: complete
  private validateBBox(): void {
    return;
  }

  private calculateBBox(): BBox {
    const positions = this.getPositions();

    let [minX, minY] = positions[0];
    let [maxX, maxY] = positions[0];

    for (const [x, y] of positions) {
      minX = x < minX ? x : minX;
      minY = y < minY ? y : minY;
      maxX = x > maxX ? x : maxX;
      maxY = y > maxY ? y : maxY;
    }

    return [minX, minY, maxX, maxY];
  }

  protected abstract getPositions(): Position[];
}

export abstract class BaseGeometry<BG extends GeoJSONBaseGeometry, FG extends JSONFG = JSONFG> extends Geometry<BG, FG> {
  public constructor(geometry: BG & FG) {
    super(geometry);
  }

  public get coordinates(): BG['coordinates'] {
    return this.geoJSONGeometry.coordinates;
  }

  protected getPositions(): Position[] {
    return flattenGeometryPositions(this.geoJSONGeometry);
  }
}

export class GeometryCollection<GC extends GeoJSONGeometryCollection = GeoJSONGeometryCollection, FG extends JSONFG = JSONFG> extends Geometry<
  GC,
  FG
> {
  public constructor(geometryCollection: GC & FG) {
    super(geometryCollection);
  }

  public get geometries(): GeoJSONGeometryCollection['geometries'] {
    return this.geoJSONGeometry.geometries;
  }

  protected getPositions(): Position[] {
    if (this.geoJSONGeometry.geometries.length === 0) {
      // we follow the same convention as turfjs & OpenLayers to return infinity bounds for empty geometry collection
      return [
        [Infinity, Infinity],
        [-Infinity, -Infinity],
      ];
    }
    return this.geoJSONGeometry.geometries.flatMap(flatGeometryCollection).flatMap(flattenGeometryPositions);
  }
}

/**
 * A polygon is an area defined by a closed ring of points.
 * The first and last points of a ring must be the same.
 * Points must be ordered counterclockwise.
 */
export class Polygon extends BaseGeometry<GeoJSONPolygon> {
  public constructor(polygon: PolygonInput) {
    super({ ...polygon, type: 'Polygon' });
  }
}

export class Line extends BaseGeometry<GeoJSONLineString> {
  public constructor(lineString: LineStringInput) {
    super({ ...lineString, type: 'LineString' });
  }
}

export class Point extends BaseGeometry<GeoJSONPoint> {
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
    validateTileMatrixIdByTileMatrixSet(tileMatrixId, tileMatrixSet);

    const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }

    validatePointByTileMatrix(this, tileMatrix, tileMatrixSet.crs);

    const [east, north] = this.coordinates;

    const width = tileEffectiveWidth(tileMatrix) * metatile;
    const height = tileEffectiveHeight(tileMatrix) * metatile;

    const {
      min: {
        coordinates: [tileMatrixBoundingBoxMinEast, tileMatrixBoundingBoxMinNorth],
      },
      max: {
        coordinates: [tileMatrixBoundingBoxMaxEast, tileMatrixBoundingBoxMaxNorth],
      },
    } = tileMatrixToBoundingBox(tileMatrix, tileMatrixSet.crs);
    const { cornerOfOrigin = 'topLeft' } = tileMatrix;

    const x = (east - tileMatrixBoundingBoxMinEast) / width;
    const y = (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMaxNorth - north : north - tileMatrixBoundingBoxMinNorth) / height;

    // when explicitly asked to reverse the intersection policy (location on the edge of the tile)
    if (reverseIntersectionPolicy) {
      const tileCol = Math.ceil(x) - 1;
      const tileRow = Math.ceil(y) - 1;
      return new Tile(tileCol, tileRow, tileMatrixSet, tileMatrixId, metatile);
    }

    // when east/north is on the maximum edge of the tile matrix (e.g. lon = 180 lat = 90 in wgs84)
    const onEdgeXTranslation = east === tileMatrixBoundingBoxMaxEast ? 1 : 0;
    const onEdgeYTranslation = north === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMinNorth : tileMatrixBoundingBoxMaxNorth) ? 1 : 0;

    const tileCol = Math.floor(x) - onEdgeXTranslation;
    const tileRow = Math.floor(y) - onEdgeYTranslation;

    return new Tile(tileCol, tileRow, tileMatrixSet, tileMatrixId, metatile);
  }
}

export class BoundingBox extends Polygon {
  public readonly min: Point;
  public readonly max: Point;

  public constructor(boundingBox: BoundingBoxInput) {
    const {
      bbox: [minX, minY, maxX, maxY],
      coordRefSys,
    } = boundingBox;
    super({
      coordRefSys,
      coordinates: [
        [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
          [minX, minY],
        ],
      ],
    });

    this.min = new Point({ coordinates: [minX, minY], coordRefSys });
    this.max = new Point({ coordinates: [maxX, maxY], coordRefSys });
  }

  public clampToBoundingBox(clampingBoundingBox: BoundingBox): BoundingBox {
    const {
      min: {
        coordinates: [clampingBoundingBoxMinEast, clampingBoundingBoxMinNorth],
      },
      max: {
        coordinates: [clampingBoundingBoxMaxEast, clampingBoundingBoxMaxNorth],
      },
    } = clampingBoundingBox;

    const {
      coordinates: [minEast, minNorth],
    } = this.min;
    const {
      coordinates: [maxEast, maxNorth],
    } = this.max;

    return new BoundingBox({
      bbox: [
        clampValues(minEast, clampingBoundingBoxMinEast, clampingBoundingBoxMaxEast),
        clampValues(minNorth, clampingBoundingBoxMinNorth, clampingBoundingBoxMaxNorth),
        clampValues(maxEast, clampingBoundingBoxMinEast, clampingBoundingBoxMaxEast),
        clampValues(maxNorth, clampingBoundingBoxMinNorth, clampingBoundingBoxMaxNorth),
      ],
      coordRefSys: this.coordRefSys,
    });
  }

  /**
   * Expands bounding box to the containing tile matrix
   * @param tileMatrixSet tile matrix set
   * @param tileMatrixId tile matrix identifier of `tileMatrixSet`
   * @returns bounding box that contains the bunding box instance snapped to the tile matrix tiles
   */
  public expandToTileMatrixCells<T extends TileMatrixSet>(tileMatrixSet: T, tileMatrixId: TileMatrixId<T>): BoundingBox {
    // TODO: consider metatile
    // validateTileMatrixSet(tileMatrixSet); // TODO: missing implementation

    const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }

    validateBoundingBoxByTileMatrix(this, tileMatrix, tileMatrixSet.crs);

    const {
      coordinates: [minPointEast, minPointNorth],
    } = this.snapMinPointToTileMatrixCell(tileMatrix);
    const {
      coordinates: [maxPointEast, maxPointNorth],
    } = this.snapMaxPointToTileMatrixCell(tileMatrix);

    return new BoundingBox({ bbox: [minPointEast, minPointNorth, maxPointEast, maxPointNorth], coordRefSys: this.coordRefSys });
  }

  /**
   * Calculates tile range that covers the bounding box
   * @param tileMatrixSet tile matrix set
   * @param tileMatrixId tile matrix identifier of `tileMatrixSet`
   * @param metatile size of a metatile
   * @returns tile range that covers the bounding box instance
   */
  public toTileRange<T extends TileMatrixSet>(tileMatrixSet: T, tileMatrixId: TileMatrixId<T>, metatile = 1): TileRange<T> {
    validateMetatile(metatile);
    // validateTileMatrixSet(tileMatrixSet); // TODO: missing implementation

    const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }

    validateBoundingBoxByTileMatrix(this, tileMatrix, tileMatrixSet.crs);

    const { cornerOfOrigin = 'topLeft' } = tileMatrix;
    const {
      coordinates: [minEast, minNorth],
    } = this.min;
    const {
      coordinates: [maxEast, maxNorth],
    } = this.max;

    const minTilePoint = new Point({
      coordinates: [minEast, cornerOfOrigin === 'topLeft' ? maxNorth : minNorth],
      coordRefSys: this.coordRefSys,
    });
    const maxTilePoint = new Point({
      coordinates: [maxEast, cornerOfOrigin === 'topLeft' ? minNorth : maxNorth],
      coordRefSys: this.coordRefSys,
    });

    const { col: minTileCol, row: minTileRow } = minTilePoint.toTile(tileMatrixSet, tileMatrixId, false, metatile);
    const { col: maxTileCol, row: maxTileRow } = maxTilePoint.toTile(tileMatrixSet, tileMatrixId, true, metatile);

    return new TileRange(minTileCol, minTileRow, maxTileCol, maxTileRow, tileMatrixSet, tileMatrixId, metatile);
  }

  private snapMinPointToTileMatrixCell(tileMatrix: TileMatrix): Point {
    const {
      coordinates: [minEast, minNorth],
    } = this.min;
    const width = tileEffectiveWidth(tileMatrix);
    const snappedMinEast = Math.floor(minEast / width) * width;
    const height = tileEffectiveHeight(tileMatrix);
    const snappedMinNorth = Math.floor(minNorth / height) * height;
    return new Point({
      coordinates: [avoidNegativeZero(snappedMinEast), avoidNegativeZero(snappedMinNorth)],
      coordRefSys: this.coordRefSys,
    });
  }

  private snapMaxPointToTileMatrixCell(tileMatrix: TileMatrix): Point {
    const {
      coordinates: [maxEast, maxNorth],
    } = this.max;
    const width = tileEffectiveWidth(tileMatrix);
    const snappedMaxEast = Math.ceil(maxEast / width) * width;
    const height = tileEffectiveHeight(tileMatrix);
    const snappedMaxNorth = Math.ceil(maxNorth / height) * height;
    return new Point({
      coordinates: [avoidNegativeZero(snappedMaxEast), avoidNegativeZero(snappedMaxNorth)],
      coordRefSys: this.coordRefSys,
    });
  }
}
