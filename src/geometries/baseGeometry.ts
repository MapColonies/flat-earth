import type { BBox, Position } from 'geojson';
import type { TileMatrixSet } from '../tiles/tileMatrixSet';
import { clampBBoxToTileMatrix, positionToTileIndex, tileEffectiveHeight, tileEffectiveWidth } from '../tiles/tiles';
import type { TileMatrixId, TileMatrixLimits } from '../tiles/types';
import type { CoordRefSys } from '../types';
import { validateCRSByOtherCRS, validateMetatile, validateTileMatrixIdByTileMatrixSet } from '../validations/validations';
import { Geometry } from './geometry';
import { Point } from './point';
import type { GeoJSONBaseGeometry } from './types';

interface SimpleLineSegment {
  start: { position: Position };
  end: { position: Position };
}

interface LineSegment extends SimpleLineSegment {
  start: { position: Position; rangeSpatialRelation: RangeRelation };
  end: { position: Position; rangeSpatialRelation: RangeRelation };
}

type RangeRelation = 'smaller' | 'in-range' | 'larger';

/**
 * Base geometry class
 */
export abstract class BaseGeometry<BG extends GeoJSONBaseGeometry> extends Geometry<BG> {
  /**
   * Base geometry constructor
   * @param geometry GeoJSON geometry and CRS
   */
  protected constructor(geometry: BG & CoordRefSys) {
    super(geometry);
  }

  /**
   * Gets coordinates of a geometry, consisting of Positions
   */
  public get coordinates(): BG['coordinates'] {
    return this.geoJSONGeometry.coordinates;
  }

  // TODO: add function to merge adjacent TileMatrixLimits

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
    validateCRSByOtherCRS(this.coordRefSys, tileMatrixSet.crs);
    validateTileMatrixIdByTileMatrixSet(tileMatrixId, tileMatrixSet);

    const tileMatrix = tileMatrixSet.getTileMatrix(tileMatrixId);
    if (!tileMatrix) {
      throw new Error('tile matrix id is not part of the given tile matrix set');
    }

    if (this.geoJSONGeometry.type === 'Point') {
      const [minEast, minNorth] = this.bBox;
      const { col, row } = positionToTileIndex([minEast, minNorth], tileMatrixSet, tileMatrixId, false, metatile);

      yield [{ tileMatrixId, minTileRow: row, maxTileRow: row, minTileCol: col, maxTileCol: col }];
      return;
    }

    const lineSegments = this.geometryToLineSegments();

    const [minBoundingBoxEast, minBoundingBoxNorth, maxBoundingBoxEast, maxBoundingBoxNorth] = clampBBoxToTileMatrix(
      this.bBox,
      tileMatrixSet,
      tileMatrixId,
      metatile
    );

    const width = maxBoundingBoxEast - minBoundingBoxEast;
    const height = maxBoundingBoxNorth - minBoundingBoxNorth;

    const isWide = width > height;
    // dim1 follows the movement of the moving range, dim2 is the perpendicular dimension to dim1. they are used to access the relevant dimension of geometric position
    const [dim1, dim2] = isWide ? [1, 0] : [0, 1];
    const { cornerOfOrigin = 'topLeft' } = tileMatrix;

    const [rangeMin, rangeMax, step]: [number, number, number] = isWide
      ? cornerOfOrigin === 'topLeft'
        ? [maxBoundingBoxNorth, minBoundingBoxNorth, -tileEffectiveHeight(tileMatrix) * metatile]
        : [minBoundingBoxNorth, maxBoundingBoxNorth, tileEffectiveHeight(tileMatrix) * metatile]
      : [minBoundingBoxEast, maxBoundingBoxEast, tileEffectiveWidth(tileMatrix) * metatile];

    const stopLoopCondition: (range: [number, number]) => boolean =
      isWide && cornerOfOrigin === 'topLeft' ? ([rangeStart]): boolean => rangeStart > rangeMax : ([rangeStart]): boolean => rangeStart < rangeMax;
    for (let range: [number, number] = [rangeMin, rangeMin + step]; stopLoopCondition(range); range = [range[0] + step, range[1] + step]) {
      const segmentsSpatialRelationToRange: LineSegment[] = lineSegments.map((lineSegment) => {
        const { start, end } = lineSegment;
        return {
          start: {
            position: start.position,
            rangeSpatialRelation: this.rangeRelation(start.position[dim1], range),
          },
          end: {
            position: end.position,
            rangeSpatialRelation: this.rangeRelation(end.position[dim1], range),
          },
        };
      });

      const segmentsWithin = segmentsSpatialRelationToRange
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
      const segmentsOverlapping = segmentsSpatialRelationToRange
        .filter(
          ({ start: { rangeSpatialRelation: startRangeSpatialRelation }, end: { rangeSpatialRelation: endRangeSpatialRelation } }) =>
            (startRangeSpatialRelation === 'smaller' && endRangeSpatialRelation === 'larger') ||
            (startRangeSpatialRelation === 'larger' && endRangeSpatialRelation === 'smaller') ||
            (startRangeSpatialRelation === 'in-range' && endRangeSpatialRelation !== 'in-range') ||
            (startRangeSpatialRelation !== 'in-range' && endRangeSpatialRelation === 'in-range')
        )
        .map((lineSegment) => this.trimLineSegment(lineSegment, [dim1, dim2], range));

      const mergedSegments = this.mergeSegments(dim2, ...segmentsWithin, ...segmentsOverlapping);

      const tileMatrixLimits = mergedSegments.map<TileMatrixLimits<T>>(({ start, end }) => {
        const [minEast, minNorth, maxEast, maxNorth]: BBox = isWide
          ? [start.position[dim2], Math.min(...range), end.position[dim2], Math.max(...range)]
          : [range[0], start.position[dim2], range[1], end.position[dim2]];

        const minTilePoint = new Point({
          coordinates: [minEast, cornerOfOrigin === 'topLeft' ? maxNorth : minNorth],
          coordRefSys: this.coordRefSys,
        });
        const maxTilePoint = new Point({
          coordinates: [maxEast, cornerOfOrigin === 'topLeft' ? minNorth : maxNorth],
          coordRefSys: this.coordRefSys,
        });
        const {
          tileIndex: { col: minTileCol },
          tileIndex: { row: minTileRow },
        } = minTilePoint.toTile(tileMatrixSet, tileMatrixId, false);
        const {
          tileIndex: { col: maxTileCol },
          tileIndex: { row: maxTileRow },
        } = maxTilePoint.toTile(tileMatrixSet, tileMatrixId, true);

        return { minTileCol, maxTileCol, minTileRow, maxTileRow, tileMatrixId };
      });

      yield this.mergeTileMatrixLimits(tileMatrixLimits, isWide);
    }

    return;
  }

  protected getPositions(): Position[] {
    return this.flatGeometryPositions(this.geoJSONGeometry);
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
    [dim1RangeStart, dim1RangeEnd]: [number, number],
    [dim2RangeStart, dim2RangeEnd]: [number, number],
    dim1Value: number
  ): number {
    return ((dim1Value - dim1RangeStart) / (dim1RangeEnd - dim1RangeStart)) * (dim2RangeEnd - dim2RangeStart) + dim2RangeStart;
  }

  private mergeSegments(dim2: number, ...lineSegments: SimpleLineSegment[]): SimpleLineSegment[] {
    const mergedSegments: SimpleLineSegment[] = [];

    structuredClone(lineSegments)
      .map((lineSegment) => {
        if (lineSegment.start.position[dim2] > lineSegment.end.position[dim2]) {
          [lineSegment.start, lineSegment.end] = [lineSegment.end, lineSegment.start];
        }
        return lineSegment;
      })
      .sort((a, b) => a.start.position[dim2] - b.start.position[dim2])
      .forEach((lineSegment) => {
        if (mergedSegments.length === 0) {
          mergedSegments.push(lineSegment);
        } else {
          const { start, end } = lineSegment;
          const { end: prevEnd } = mergedSegments[mergedSegments.length - 1];

          if (start.position[dim2] <= prevEnd.position[dim2]) {
            mergedSegments[mergedSegments.length - 1].end.position[dim2] =
              end.position[dim2] > prevEnd.position[dim2] ? end.position[dim2] : prevEnd.position[dim2];
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

  private rangeRelation(value: number, [rangeStart, rangeEnd]: [number, number]): RangeRelation {
    return Math.min(rangeStart, rangeEnd) > value ? 'smaller' : Math.max(rangeStart, rangeEnd) < value ? 'larger' : 'in-range';
  }

  private trimLineSegment(
    lineSegment: LineSegment,
    [dim1, dim2]: [number, number],
    [rangeValueStart, rangeValueEnd]: [number, number]
  ): SimpleLineSegment {
    const { start, end } = structuredClone(lineSegment);
    const [rangeMin, rangeMax] = [Math.min(rangeValueStart, rangeValueEnd), Math.max(rangeValueStart, rangeValueEnd)];

    const dim1Range: [number, number] = [start.position[dim1], end.position[dim1]];
    const dim2Range: [number, number] = [start.position[dim2], end.position[dim2]];

    const [trimStart, trimEnd] = [start, end].map(({ position, rangeSpatialRelation }) => {
      if (rangeSpatialRelation === 'smaller') {
        position[dim2] = this.interpolateLinearLine(dim1Range, dim2Range, rangeMin);
        position[dim1] = rangeMin;
      }

      if (rangeSpatialRelation === 'larger') {
        position[dim2] = this.interpolateLinearLine(dim1Range, dim2Range, rangeMax);
        position[dim1] = rangeMax;
      }

      return { position };
    });

    return {
      start: trimStart,
      end: trimEnd,
    };
  }
}
