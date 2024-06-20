import type { Position } from 'geojson';
import type { TileMatrixSet } from '../tiles/tileMatrixSet';
import { clampBBoxToTileMatrix, positionToTileIndex, tileEffectiveHeight, tileEffectiveWidth } from '../tiles/tiles';
import type { TileMatrixId, TileMatrixLimits } from '../tiles/types';
import type { CoordRefSysJSON } from '../types';
import { validateCRSByOtherCRS, validateMetatile, validateTileMatrixIdByTileMatrixSet } from '../validations/validations';
import { Geometry } from './geometry';
import type { GeoJSONBaseGeometry } from './types';

type RangeRelation = 'smaller' | 'in-range' | 'larger';

interface EndPoint {
  position: Position;
  rangeSpatialRelation: RangeRelation;
}

interface SimpleLineSegment {
  start: Omit<EndPoint, 'rangeSpatialRelation'>;
  end: Omit<EndPoint, 'rangeSpatialRelation'>;
}

interface LineSegment extends SimpleLineSegment {
  start: EndPoint;
  end: EndPoint;
}

interface LineSegmentsSpan {
  lineSegments: LineSegment[];
  isCrossingRange: boolean;
}

interface NumericRange {
  start: number;
  end: number;
}

/**
 * Base geometry class
 */
export abstract class BaseGeometry<BG extends GeoJSONBaseGeometry> extends Geometry<BG> {
  /**
   * Base geometry constructor
   * @param geometry GeoJSON geometry and CRS
   */
  protected constructor(geometry: BG & CoordRefSysJSON) {
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
  ): Generator<TileMatrixLimits<T>, undefined> {
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

      yield { tileMatrixId, minTileRow: row, maxTileRow: row, minTileCol: col, maxTileCol: col };
      return;
    }

    const linearRingsSegments = this.toLinearRingsSegments();

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
      const spansInRange = this.calculateSpansInRange(linearRingsSegments, range, [dim1, dim2]);
      let mergedRanges: NumericRange[];

      switch (this.geoJSONGeometry.type) {
        case 'LineString': {
          mergedRanges = this.spansToBoundingRanges(dim2, ...spansInRange.flat());
          break;
        }
        case 'Polygon': {
          const { crossingSpans, nonCrossingSpans } = this.classifySpans(spansInRange);
          const crossingBoundingRanges = this.crossingSpansToBoundingRanges(dim2, ...crossingSpans.flat());
          const nonCrossingBoundingRanges = this.spansToBoundingRanges(dim2, ...nonCrossingSpans.flat());
          mergedRanges = this.mergeOverlappingRanges(...crossingBoundingRanges, ...nonCrossingBoundingRanges);
          break;
        }
        default:
          throw new Error('unsupported geometry type');
      }

      const tileMatrixLimits = mergedRanges.map((perpendicularRange) => {
        const { col: startTileCol, row: startTileRow } = positionToTileIndex(
          isWide ? [perpendicularRange.start, range[0]] : [range[0], perpendicularRange.start],
          tileMatrixSet,
          tileMatrixId,
          false,
          metatile
        );
        const { col: endTileCol, row: endTileRow } = positionToTileIndex(
          isWide ? [perpendicularRange.end, range[0]] : [range[0], perpendicularRange.end],
          tileMatrixSet,
          tileMatrixId,
          false,
          metatile
        );

        return {
          minTileCol: Math.min(startTileCol, endTileCol),
          maxTileCol: Math.max(startTileCol, endTileCol),
          minTileRow: Math.min(startTileRow, endTileRow),
          maxTileRow: Math.max(startTileRow, endTileRow),
          tileMatrixId,
        };
      });

      const tileMatricesLimits = this.mergeTileMatrixLimits(tileMatrixLimits, isWide);
      for (const tileMatrixLimits of tileMatricesLimits) {
        yield tileMatrixLimits;
      }
    }

    return;
  }

  protected getAllPositions(): Position[] {
    return this.flatGeometryPositions(this.geoJSONGeometry);
  }

  private classifySpans(spansInRange: LineSegmentsSpan[][]): {
    crossingSpans: LineSegmentsSpan[][];
    nonCrossingSpans: LineSegmentsSpan[][];
  } {
    const classifiedSpansInRange = spansInRange.map((spanInRange, index) => {
      const crossingSpans = spanInRange.filter((span) => span.isCrossingRange);
      const nonCrossingSpans = index > 0 ? [] : spanInRange.filter((span) => !span.isCrossingRange);

      return {
        crossingSpans,
        nonCrossingSpans,
      };
    });

    const crossingSpans = classifiedSpansInRange.map((span) => span.crossingSpans);
    const nonCrossingSpans = classifiedSpansInRange.map((span) => span.nonCrossingSpans);
    return {
      crossingSpans,
      nonCrossingSpans,
    };
  }

  private calculateSpansInRange(
    linearRingsSegments: SimpleLineSegment[][],
    range: [number, number],
    [dim1, dim2]: [number, number]
  ): LineSegmentsSpan[][] {
    return linearRingsSegments.map((linearRingSegments) => {
      const lineSegments: LineSegment[] = linearRingSegments.map((linearRingSegment) => {
        const { start, end } = linearRingSegment;
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

      return this.lineSegmentsToSpansInRange(lineSegments, range, [dim1, dim2]);
    });
  }

  private crossingSpansToBoundingRanges(dim: number, ...spans: LineSegmentsSpan[]): NumericRange[] {
    const boundingRanges: NumericRange[] = structuredClone(spans)
      .sort((a, b) => {
        const valueA =
          a.lineSegments[0].start.rangeSpatialRelation === 'smaller' ? a.lineSegments[0].start.position[dim] : a.lineSegments[0].end.position[dim];
        const valueB =
          b.lineSegments[0].start.rangeSpatialRelation === 'smaller' ? b.lineSegments[0].start.position[dim] : b.lineSegments[0].end.position[dim];
        return valueA - valueB;
      })
      .reduce<NumericRange[]>((agg, span, index) => {
        const { start, end } = this.spanToBoundingRange(dim, span);
        return (index & 1) === 0 ? [...agg, { start, end }] : agg.toSpliced(agg.length - 1, 1, { ...agg[agg.length - 1], ...{ end } });
      }, []);

    return boundingRanges;
  }

  private isRangeCrossingSpan(lineSegmentsInRange: LineSegment[]): boolean {
    const startRangeSpatialRelation = lineSegmentsInRange[0].start.rangeSpatialRelation;
    const endRangeSpatialRelation = lineSegmentsInRange[lineSegmentsInRange.length - 1].end.rangeSpatialRelation;
    return (
      startRangeSpatialRelation !== endRangeSpatialRelation &&
      ['smaller', 'larger'].includes(startRangeSpatialRelation) &&
      ['smaller', 'larger'].includes(endRangeSpatialRelation)
    );
  }

  private toLinearRingsSegments(): SimpleLineSegment[][] {
    let linearRings: Position[][];
    const linearRingsSegments: SimpleLineSegment[][] = [];

    switch (this.geoJSONGeometry.type) {
      case 'LineString':
        linearRings = [this.geoJSONGeometry.coordinates];
        break;
      case 'Polygon':
        linearRings = this.geoJSONGeometry.coordinates;
        break;
      default:
        throw new Error('unsupported geometry type');
    }

    linearRings.forEach((linearRing) => {
      const linearRingSegments: SimpleLineSegment[] = [];
      linearRing.forEach((position, index) => {
        if (index < linearRing.length - 1) {
          linearRingSegments.push({
            start: { position },
            end: { position: linearRing[index + 1] },
          });
        }
      });
      linearRingsSegments.push(linearRingSegments);
    });

    return linearRingsSegments;
  }

  private interpolateLinearLine(
    [dim1RangeStart, dim1RangeEnd]: [number, number],
    [dim2RangeStart, dim2RangeEnd]: [number, number],
    dim1Value: number
  ): number {
    return ((dim1Value - dim1RangeStart) / (dim1RangeEnd - dim1RangeStart)) * (dim2RangeEnd - dim2RangeStart) + dim2RangeStart;
  }

  private lineSegmentsToSpansInRange(lineSegments: LineSegment[], range: [number, number], [dim1, dim2]: [number, number]): LineSegmentsSpan[] {
    const spansInRange: LineSegmentsSpan[] = [];
    const lineSegmentsInRange: LineSegment[] = [];

    for (const lineSegment of lineSegments) {
      const {
        start: { rangeSpatialRelation: startRangeSpatialRelation },
        end: { rangeSpatialRelation: endRangeSpatialRelation },
      } = lineSegment;

      if (startRangeSpatialRelation === 'in-range' && endRangeSpatialRelation === 'in-range') {
        lineSegmentsInRange.push(lineSegment);
      }

      if (
        (startRangeSpatialRelation === 'smaller' && endRangeSpatialRelation === 'larger') ||
        (startRangeSpatialRelation === 'larger' && endRangeSpatialRelation === 'smaller') ||
        (startRangeSpatialRelation === 'in-range' && endRangeSpatialRelation !== 'in-range') ||
        (startRangeSpatialRelation !== 'in-range' && endRangeSpatialRelation === 'in-range')
      ) {
        const trimmedLineSegment = this.trimLineSegment(lineSegment, [dim1, dim2], range);
        lineSegmentsInRange.push({
          start: { position: trimmedLineSegment.start.position, rangeSpatialRelation: startRangeSpatialRelation },
          end: { position: trimmedLineSegment.end.position, rangeSpatialRelation: endRangeSpatialRelation },
        });

        if (endRangeSpatialRelation !== 'in-range') {
          spansInRange.push({
            lineSegments: structuredClone(lineSegmentsInRange),
            isCrossingRange: this.isRangeCrossingSpan(lineSegmentsInRange),
          });
          lineSegmentsInRange.length = 0;
        }
      }
    }

    if (lineSegmentsInRange.length > 0) {
      spansInRange.push({
        lineSegments: structuredClone(lineSegmentsInRange),
        isCrossingRange: this.isRangeCrossingSpan(lineSegmentsInRange),
      });
    }

    // since line segments are looped arbitrarily we require that a truncated span is joined together (valid span should have both)
    if (spansInRange.length > 1) {
      const rangeLineSegmentFirstSpan = spansInRange[0];

      if (rangeLineSegmentFirstSpan.lineSegments[0].start.rangeSpatialRelation === 'in-range') {
        const rangeLineSegmentsLastSpan = spansInRange.pop();
        if (rangeLineSegmentsLastSpan) {
          const joinedLineSegmentsInRange = [...rangeLineSegmentsLastSpan.lineSegments, ...rangeLineSegmentFirstSpan.lineSegments];
          spansInRange.splice(0, 1, {
            lineSegments: joinedLineSegmentsInRange,
            isCrossingRange: this.isRangeCrossingSpan(joinedLineSegmentsInRange),
          });
        }
      }
    }

    return spansInRange;
  }

  private mergeOverlappingRanges(...ranges: NumericRange[]): NumericRange[] {
    const mergedRanges: NumericRange[] = [];

    structuredClone(ranges)
      .sort((rangeA, rangeB) => rangeA.start - rangeB.start)
      .forEach((range) => {
        if (mergedRanges.length === 0) {
          mergedRanges.push(range);
        } else if (range.start <= mergedRanges[mergedRanges.length - 1].end) {
          mergedRanges[mergedRanges.length - 1].end = Math.max(range.end, mergedRanges[mergedRanges.length - 1].end);
        } else {
          mergedRanges.push(range);
        }
      });
    return mergedRanges;
  }

  private mergeTileMatrixLimits<T extends TileMatrixSet>(tileMatricesLimits: TileMatrixLimits<T>[], isWide: boolean): TileMatrixLimits<T>[] {
    const mergedTileMatricesLimits: TileMatrixLimits<T>[] = [];

    structuredClone(tileMatricesLimits)
      .sort((tileMatrixLimitsA, tileMatrixLimitsB) =>
        isWide ? tileMatrixLimitsA.minTileCol - tileMatrixLimitsB.minTileCol : tileMatrixLimitsA.minTileRow - tileMatrixLimitsB.minTileRow
      )
      .forEach((tileMatrixLimits) => {
        if (mergedTileMatricesLimits.length === 0) {
          mergedTileMatricesLimits.push(tileMatrixLimits);
        } else {
          const { minTileRow, maxTileRow, minTileCol, maxTileCol } = tileMatrixLimits;
          const { maxTileCol: prevMaxTileCol, maxTileRow: prevMaxTileRow } = mergedTileMatricesLimits[mergedTileMatricesLimits.length - 1];

          if (isWide ? minTileCol - 1 <= prevMaxTileCol : minTileRow - 1 <= prevMaxTileRow) {
            mergedTileMatricesLimits[mergedTileMatricesLimits.length - 1] = {
              ...mergedTileMatricesLimits[mergedTileMatricesLimits.length - 1],
              ...(isWide
                ? { maxTileCol: maxTileCol > prevMaxTileCol ? maxTileCol : prevMaxTileCol }
                : { maxTileRow: maxTileRow > prevMaxTileRow ? maxTileRow : prevMaxTileRow }),
            };
          } else {
            mergedTileMatricesLimits.push(tileMatrixLimits);
          }
        }
      });

    return mergedTileMatricesLimits;
  }

  private rangeRelation(value: number, [rangeStart, rangeEnd]: [number, number]): RangeRelation {
    return Math.min(rangeStart, rangeEnd) > value ? 'smaller' : Math.max(rangeStart, rangeEnd) < value ? 'larger' : 'in-range';
  }

  private segmentToRange(dim: number, lineSegment: LineSegment): NumericRange {
    const {
      start: { position: startPosition },
      end: { position: endPosition },
    } = lineSegment;
    return {
      start: Math.min(startPosition[dim], endPosition[dim]),
      end: Math.max(startPosition[dim], endPosition[dim]),
    };
  }

  private spanToBoundingRange(dim: number, { lineSegments }: LineSegmentsSpan): NumericRange {
    const rangesStart = [];
    const rangesEnd = [];

    for (const lineSegment of lineSegments) {
      const { start, end } = this.segmentToRange(dim, lineSegment);
      rangesStart.push(start);
      rangesEnd.push(end);
    }

    return {
      start: Math.min(...rangesStart),
      end: Math.max(...rangesEnd),
    };
  }

  private spansToBoundingRanges(dim: number, ...spans: LineSegmentsSpan[]): NumericRange[] {
    return spans.map((span) => this.spanToBoundingRange(dim, span));
  }

  private trimLineSegment(lineSegment: LineSegment, [dim1, dim2]: [number, number], [rangeStart, rangeEnd]: [number, number]): SimpleLineSegment {
    const { start, end } = structuredClone(lineSegment);
    const [rangeMin, rangeMax] = [Math.min(rangeStart, rangeEnd), Math.max(rangeStart, rangeEnd)];

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
