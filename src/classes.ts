import type { BBox, Position } from 'geojson';
import { Tile } from './tiles/tile';
import type { TileMatrixSet } from './tiles/tileMatrixSet';
import { TileRange } from './tiles/tileRange';
import { avoidNegativeZero, clampValues, tileEffectiveHeight, tileEffectiveWidth, tileMatrixToBBox } from './tiles/tiles';
import type { TileMatrixId, TileMatrixLimits } from './tiles/types';
import type {
  ArrayElement,
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
  validateCRS,
  validateMetatile,
  validatePointByTileMatrix,
  validateTileMatrixIdByTileMatrixSet,
} from './validations/validations';

interface SimpleLineSegment {
  start: { position: Position };
  end: { position: Position };
}

interface LineSegment extends SimpleLineSegment {
  start: { position: Position; rangeSpatialRelation: RangeSpatialRelation };
  end: { position: Position; rangeSpatialRelation: RangeSpatialRelation };
}
type RangeSpatialRelation = 'smaller' | 'in-range' | 'larger';

/**
 * Geometry class
 */
export abstract class Geometry<G extends GeoJSONGeometry, FG extends JSONFG = JSONFG> {
  protected readonly bbox: BBox;

  /**
   * Geometry constructor
   * @param geoJSONGeometry
   */
  protected constructor(protected readonly geoJSONGeometry: G & FG) {
    this.bbox = this.calculateBBox();
    this.validateBBox();
  }

  /**
   * Gets CRS of the geometry
   */
  public get coordRefSys(): FG['coordRefSys'] {
    return this.geoJSONGeometry.coordRefSys;
  }

  /**
   * Gets the "type" property of GeoJSON geometry objects
   */
  public get type(): G['type'] {
    return this.geoJSONGeometry.type;
  }

  /**
   * Gets the OGC features and geometries JSON (JSON-FG) of the geometry
   * @returns JSON-FG representation of the geometry
   */
  public getJSONFG(): G & FG {
    return this.geoJSONGeometry;
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

      const [boundingBoxMinEast, boundingBoxMinNorth, boundingBoxMaxEast, boundingBoxMaxNorth] = boundingBox.bbox;
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

    // TODO: complete assertions against CRS
  }

  private calculateBBox(): BBox {
    const positions = this.getPositions();

    let [minEast, minNorth] = positions[0];
    let [maxEast, maxNorth] = positions[0];

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

/**
 * Base geometry class
 */
export abstract class BaseGeometry<BG extends GeoJSONBaseGeometry, FG extends JSONFG = JSONFG> extends Geometry<BG, FG> {
  /**
   * Base geometry constructor
   * @param geometry
   */
  public constructor(geometry: BG & FG) {
    super(geometry);
  }

  /**
   * Gets GeoJSON "coordinates" property of a geometry, consisting of Positions
   */
  public get coordinates(): BG['coordinates'] {
    return this.geoJSONGeometry.coordinates;
  }

  /**
   * Convert geometry to an iterator of tile matrix limits
   * @param tileMatrixSet tile matrix set
   * @param tileMatrixId tile matrix identifier of `tileMatrixSet`
   * @param metatile size of a metatile
   * @returns generator function of tile matrix limits containing the geometry
   */
  public *toTileMatrixLimits<T extends TileMatrixSet>(
    tileMatrixSet: T,
    tileMatrixId: TileMatrixId<T>,
    metatile = 1
  ): Generator<TileMatrixLimits<T>[]> {
    validateMetatile(metatile);
    // validateTileMatrixSet(tileMatrixSet); // TODO: missing implementation
    validateCRS(this.coordRefSys, tileMatrixSet.crs);
    validateTileMatrixIdByTileMatrixSet(tileMatrixId, tileMatrixSet);

    const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }

    if (this instanceof Point) {
      const { col, row } = this.toTile(tileMatrixSet, tileMatrixId, false);
      yield [{ tileMatrixId, minTileRow: row, maxTileRow: row, minTileCol: col, maxTileCol: col }];
      return;
    }

    const lineSegments = this.geometryToLineSegments();

    const [minBoundinBoxEast, minBoundinBoxNorth, maxBoundinBoxEast, maxBoundinBoxNorth] = this.toBoundingBox()
      .toTileRange(tileMatrixSet, tileMatrixId, metatile)
      .toBoundingBox().bBox;

    const width = maxBoundinBoxEast - minBoundinBoxEast;
    const height = maxBoundinBoxNorth - minBoundinBoxNorth;

    const isWide = width > height;
    // axis1 follows the movement of the moving range, axis2 is the perpendicular axis to axis1. they are used to access the relevant axis of geometric position
    const [axis1Index, axis2Index] = isWide ? [1, 0] : [0, 1];
    const { cornerOfOrigin = 'topLeft' } = tileMatrix;

    const [startAxis, endAxis, axisStep]: [number, number, number] = isWide
      ? cornerOfOrigin === 'topLeft'
        ? [maxBoundinBoxNorth, minBoundinBoxNorth, -tileEffectiveHeight(tileMatrix) * metatile]
        : [minBoundinBoxNorth, maxBoundinBoxNorth, tileEffectiveHeight(tileMatrix) * metatile]
      : [minBoundinBoxEast, maxBoundinBoxEast, tileEffectiveWidth(tileMatrix) * metatile];

    const stopLoopCondition = (axis: number): boolean => (isWide ? (cornerOfOrigin === 'topLeft' ? axis > endAxis : axis < endAxis) : axis < endAxis);
    for (let axis = startAxis; stopLoopCondition(axis); axis += axisStep) {
      const segmentsInRange: LineSegment[] = lineSegments.map((lineSegment) => {
        const { start, end } = lineSegment;
        return {
          start: {
            position: start.position,
            rangeSpatialRelation: this.rangeSpatialRelation(start.position[axis1Index], [axis, axis + axisStep]),
          },
          end: {
            position: end.position,
            rangeSpatialRelation: this.rangeSpatialRelation(end.position[axis1Index], [axis, axis + axisStep]),
          },
        };
      });

      const segmentsWithin = segmentsInRange
        .filter(
          ({ start: { rangeSpatialRelation: startRangeSpatialRelation }, end: { rangeSpatialRelation: endRangeSpatialRelation } }) =>
            startRangeSpatialRelation === 'in-range' && endRangeSpatialRelation === 'in-range'
        )
        .map<SimpleLineSegment>((lineSegment) => {
          return {
            start: { position: lineSegment.start.position },
            end: { position: lineSegment.end.position },
          };
        });
      const segmentsOverlapping = segmentsInRange
        .filter(
          ({ start: { rangeSpatialRelation: startRangeSpatialRelation }, end: { rangeSpatialRelation: endRangeSpatialRelation } }) =>
            (startRangeSpatialRelation === 'smaller' && endRangeSpatialRelation === 'larger') ||
            (startRangeSpatialRelation === 'larger' && endRangeSpatialRelation === 'smaller') ||
            (startRangeSpatialRelation === 'in-range' && endRangeSpatialRelation !== 'in-range') ||
            (startRangeSpatialRelation !== 'in-range' && endRangeSpatialRelation === 'in-range')
        )
        .map((lineSegment) => this.trimLineSegment(lineSegment, [axis1Index, axis2Index], [axis, axis + axisStep]));

      const mergedSegments = this.mergeSegments(axis2Index, ...segmentsWithin, ...segmentsOverlapping);

      const tileMatrixLimits = mergedSegments.map<TileMatrixLimits<T>>(({ start, end }) => {
        const [minEast, minNorth, maxEast, maxNorth]: BBox = isWide
          ? [start.position[axis2Index], Math.min(axis, axis + axisStep), end.position[axis2Index], Math.max(axis, axis + axisStep)]
          : [axis, start.position[axis2Index], axis + axisStep, end.position[axis2Index]];

        const minTilePoint = new Point({
          coordinates: [minEast, cornerOfOrigin === 'topLeft' ? maxNorth : minNorth],
          coordRefSys: this.coordRefSys,
        });
        const maxTilePoint = new Point({
          coordinates: [maxEast, cornerOfOrigin === 'topLeft' ? minNorth : maxNorth],
          coordRefSys: this.coordRefSys,
        });
        const { col: minTileCol, row: minTileRow } = minTilePoint.toTile(tileMatrixSet, tileMatrixId, false);
        const { col: maxTileCol, row: maxTileRow } = maxTilePoint.toTile(tileMatrixSet, tileMatrixId, true);

        return { minTileCol, maxTileCol, minTileRow, maxTileRow, tileMatrixId };
      });

      yield this.mergeTileMatrixLimits(tileMatrixLimits, isWide);
    }

    return;
  }

  protected getPositions(): Position[] {
    return flattenGeometryPositions(this.geoJSONGeometry);
  }

  private geometryToLineSegments(): SimpleLineSegment[] {
    const lineSegments: SimpleLineSegment[] = [];
    const positions = this.getPositions();

    positions.forEach((position, index) => {
      if (index < positions.length - 1) {
        lineSegments.push({
          start: { position },
          end: { position: positions[index + 1] },
        });
      }
    });

    return lineSegments;
  }

  private interpolateLinearLine(
    [axis1RangeStart, axis1RangeEnd]: [number, number],
    [axis2RangeStart, axis2RangeEnd]: [number, number],
    axisRangeValue: number
  ): number {
    return ((axisRangeValue - axis1RangeStart) / (axis1RangeEnd - axis1RangeStart)) * (axis2RangeEnd - axis2RangeStart) + axis2RangeStart;
  }

  private mergeSegments(axis2Index: number, ...lineSegments: SimpleLineSegment[]): SimpleLineSegment[] {
    const mergedSegments: SimpleLineSegment[] = [];

    structuredClone(lineSegments)
      .map((lineSegment) => {
        if (lineSegment.start.position[axis2Index] > lineSegment.end.position[axis2Index]) {
          [lineSegment.start, lineSegment.end] = [lineSegment.end, lineSegment.start];
        }
        return lineSegment;
      })
      .sort((a, b) => a.start.position[axis2Index] - b.start.position[axis2Index])
      .forEach((lineSegment) => {
        if (mergedSegments.length === 0) {
          mergedSegments.push(lineSegment);
        } else {
          const { start, end } = lineSegment;
          const { end: prevEnd } = mergedSegments[mergedSegments.length - 1];

          if (start.position[axis2Index] <= prevEnd.position[axis2Index]) {
            mergedSegments[mergedSegments.length - 1].end.position[axis2Index] =
              end.position[axis2Index] > prevEnd.position[axis2Index] ? end.position[axis2Index] : prevEnd.position[axis2Index];
          } else {
            mergedSegments.push(lineSegment);
          }
        }
      });

    return mergedSegments;
  }

  private mergeTileMatrixLimits<T extends TileMatrixSet>(tileMatrixLimitsArr: TileMatrixLimits<T>[], isWide: boolean): TileMatrixLimits<T>[] {
    const mergedTileMatrixLimits: TileMatrixLimits<T>[] = [];

    structuredClone(tileMatrixLimitsArr)
      .sort((a, b) => (isWide ? a.minTileCol - b.minTileCol : a.minTileRow - b.minTileRow))
      .forEach((tileMatrixLimits) => {
        if (mergedTileMatrixLimits.length === 0) {
          mergedTileMatrixLimits.push(tileMatrixLimits);
        } else {
          const { minTileRow, maxTileRow, minTileCol, maxTileCol } = tileMatrixLimits;
          const { maxTileCol: prevMaxTileCol, maxTileRow: prevMaxTileRow } = mergedTileMatrixLimits[mergedTileMatrixLimits.length - 1];

          if (isWide ? minTileCol - 1 <= prevMaxTileCol : minTileRow - 1 <= prevMaxTileRow) {
            mergedTileMatrixLimits[mergedTileMatrixLimits.length - 1] = {
              ...mergedTileMatrixLimits[mergedTileMatrixLimits.length - 1],
              ...(isWide
                ? { maxTileCol: maxTileCol > prevMaxTileCol ? maxTileCol : prevMaxTileCol }
                : { maxTileRow: maxTileRow > prevMaxTileRow ? maxTileRow : prevMaxTileRow }),
            };
          } else {
            mergedTileMatrixLimits.push(tileMatrixLimits);
          }
        }
      });

    return mergedTileMatrixLimits;
  }

  private rangeSpatialRelation(axis: number, [rangeStart, rangeEnd]: [number, number]): RangeSpatialRelation {
    return Math.min(rangeStart, rangeEnd) > axis ? 'smaller' : Math.max(rangeStart, rangeEnd) < axis ? 'larger' : 'in-range';
  }

  private trimLineSegment(
    lineSegment: LineSegment,
    [axis1Index, axis2Index]: [number, number],
    [axisRangeValueStart, axisRangeValueEnd]: [number, number]
  ): SimpleLineSegment {
    const { start, end } = structuredClone(lineSegment);
    const [rangeMin, rangeMax] = [Math.min(axisRangeValueStart, axisRangeValueEnd), Math.max(axisRangeValueStart, axisRangeValueEnd)];

    const axis1Range: [number, number] = [start.position[axis1Index], end.position[axis1Index]];
    const axis2Range: [number, number] = [start.position[axis2Index], end.position[axis2Index]];

    const [trimStart, trimEnd] = [start, end].map(({ position, rangeSpatialRelation }) => {
      if (rangeSpatialRelation === 'smaller') {
        position[axis2Index] = this.interpolateLinearLine(axis1Range, axis2Range, rangeMin);
        position[axis1Index] = rangeMin;
      }

      if (rangeSpatialRelation === 'larger') {
        position[axis2Index] = this.interpolateLinearLine(axis1Range, axis2Range, rangeMax);
        position[axis1Index] = rangeMax;
      }

      return { position };
    });

    return {
      start: trimStart,
      end: trimEnd,
    };
  }
}

/**
 * Geometry collection class
 */
export class GeometryCollection<GC extends GeoJSONGeometryCollection = GeoJSONGeometryCollection, FG extends JSONFG = JSONFG> extends Geometry<
  GC,
  FG
> {
  /**
   * Geometry collection constructor
   * @param geometryCollection
   */
  public constructor(geometryCollection: GC & FG) {
    super(geometryCollection);
  }

  /**
   * Gets GeoJSON geometries contained inside the geometry collection
   */
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
 * Polygon geometry class
 */
export class Polygon extends BaseGeometry<GeoJSONPolygon> {
  /**
   * Polygon geometry constructor
   * @param polygon
   */
  public constructor(polygon: PolygonInput) {
    super({ ...polygon, type: 'Polygon' });
  }
}

/**
 * Line geometry class
 */
export class Line extends BaseGeometry<GeoJSONLineString> {
  /**
   * Line geometry constructor
   * @param lineString
   */
  public constructor(lineString: LineStringInput) {
    super({ ...lineString, type: 'LineString' });
  }
}

/**
 * Point geometry class
 */
export class Point extends BaseGeometry<GeoJSONPoint> {
  /**
   * Point geometry constructor
   * @param point
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
    validateCRS(this.coordRefSys, tileMatrixSet.crs);
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

      return new Tile(tileCol, tileRow, tileMatrixSet, tileMatrixId, metatile);
    }

    // when east/north is on the maximum edge of the tile matrix (e.g. lon = 180 lat = 90 in wgs84)
    const onEdgeEastTranslation = east === tileMatrixBoundingBoxMaxEast ? 1 : 0;
    const onEdgeNorthTranslation = north === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMinNorth : tileMatrixBoundingBoxMaxNorth) ? 1 : 0;

    const tileCol = Math.floor(tempTileCol) - onEdgeEastTranslation;
    const tileRow = Math.floor(tempTileRow) - onEdgeNorthTranslation;

    return new Tile(tileCol, tileRow, tileMatrixSet, tileMatrixId, metatile);
  }
}

/**
 * Bounding box geometry class
 */
export class BoundingBox extends Polygon {
  /**
   * Bounding box geometry constructor
   * @param boundingBox
   */
  public constructor(boundingBox: BoundingBoxInput) {
    const {
      bbox: [minEast, minNorth, maxEast, maxNorth],
      coordRefSys,
    } = boundingBox;

    super({
      coordRefSys,
      coordinates: [
        [
          [minEast, minNorth],
          [maxEast, minNorth],
          [maxEast, maxNorth],
          [minEast, maxNorth],
          [minEast, minNorth],
        ],
      ],
    });
  }

  /**
   * Gets GeoJSON bounding box
   */
  public get bBox(): BBox {
    return this.bbox;
  }

  /**
   * Clamps bounding box extent to that of another bounding box
   * @param clampingBoundingBox bounding box to clamp to
   * @returns bounding box with extents clamped to those of `clampingBoundingBox`
   */
  public clampToBoundingBox(clampingBoundingBox: BoundingBox): BoundingBox {
    const [clampingBoundingBoxMinEast, clampingBoundingBoxMinNorth, clampingBoundingBoxMaxEast, clampingBoundingBoxMaxNorth] =
      clampingBoundingBox.bBox;

    const [minEast, minNorth, maxEast, maxNorth] = this.bbox;

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
    validateCRS(this.coordRefSys, tileMatrixSet.crs);

    const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }

    validateBoundingBoxByTileMatrix(this, tileMatrix);

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
    validateCRS(this.coordRefSys, tileMatrixSet.crs);

    const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }

    validateBoundingBoxByTileMatrix(this, tileMatrix);

    const { cornerOfOrigin = 'topLeft' } = tileMatrix;
    const [minEast, minNorth, maxEast, maxNorth] = this.bbox;

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

  private snapMinPointToTileMatrixCell<T extends TileMatrixSet>(tileMatrix: ArrayElement<T['tileMatrices']>): Point {
    const [minEast, minNorth] = this.bbox;
    const width = tileEffectiveWidth(tileMatrix);
    const snappedMinEast = Math.floor(minEast / width) * width;
    const height = tileEffectiveHeight(tileMatrix);
    const snappedMinNorth = Math.floor(minNorth / height) * height;
    return new Point({
      coordinates: [avoidNegativeZero(snappedMinEast), avoidNegativeZero(snappedMinNorth)],
      coordRefSys: this.coordRefSys,
    });
  }

  private snapMaxPointToTileMatrixCell<T extends TileMatrixSet>(tileMatrix: ArrayElement<T['tileMatrices']>): Point {
    const [, , maxEast, maxNorth] = this.bbox;
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
