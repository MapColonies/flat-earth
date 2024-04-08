import { bbox, booleanContains, dissolve, feature, featureCollection, flatten, intersect } from '@turf/turf';
import type { Polygon as GeoJSONPolygon } from 'geojson';
import { BoundingBox, GeoPoint, Geometry, GeometryCollection, Polygon } from '../classes';
import { geometryToFeature } from '../converters/turf';
import type { ArrayElement, Comparison, GeoJSONGeometry } from '../types';
import { flatGeometryCollection } from '../utilities';
import { validateGeometryByTileMatrix, validateMetatile, validateTileMatrix } from '../validations/validations';
import { Tile } from './tile';
import type { TileMatrixSet } from './tileMatrixSet';
import { TileRange } from './tileRange';
import type { TileMatrix, TileMatrixId } from './types';

function polygonToTileRanges<T extends TileMatrixSet>(polygon: Polygon, tileMatrix: ArrayElement<T['tileMatrices']>, metatile = 1): TileRange<T>[] {
  const tileRanges: TileRange<T>[] = [];
  const boundingBox = polygon.toBoundingBox();
  const {
    identifier: { code: tileMatrixId },
  } = tileMatrix;

  const { minTileCol, minTileRow, maxTileCol, maxTileRow } = boundingBox.toTileRange(tileMatrix, metatile);

  const width = maxTileCol - minTileCol;
  const height = maxTileRow - minTileRow;

  const [minTileIndex, maxTileIndex]: [number, number] = width > height ? [minTileRow, maxTileRow] : [minTileCol, maxTileCol];

  for (let tileIndex = minTileIndex; tileIndex <= maxTileIndex; tileIndex += 1) {
    const tileRangeLimits =
      width > height ? ([minTileCol, tileIndex, maxTileCol, tileIndex] as const) : ([tileIndex, minTileRow, tileIndex, maxTileRow] as const);

    const movingTileRange = new TileRange(...tileRangeLimits, tileMatrixId, metatile);

    const movingTileRangeBoundingBox = geometryToFeature(movingTileRange.toBoundingBox(tileMatrix, true));
    const intersections = intersect(featureCollection([geometryToFeature(polygon), movingTileRangeBoundingBox]));

    if (intersections === null) {
      return [];
    }

    const intersectingPolygons = flatten(intersections);
    const movingTileRanges: TileRange<T>[] = [];
    intersectingPolygons.features
      .map((polygon) => {
        const boundingBox = new BoundingBox(bbox(polygon.geometry));
        const { minTileCol, minTileRow, maxTileCol, maxTileRow } = boundingBox.toTileRange(tileMatrix, metatile);
        return new TileRange(minTileCol, minTileRow, maxTileCol, maxTileRow, tileMatrixId, metatile);
      })
      .sort((a, b) => (width > height ? a.minTileRow - b.minTileRow : a.minTileCol - b.minTileCol))
      .forEach((tileRange) => {
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        const lastTileRange = movingTileRanges.at(-1);

        if (!lastTileRange) {
          movingTileRanges.push(tileRange);
          return;
        }

        const [prevMin, prevMax, currMin, currMax] =
          width > height
            ? [lastTileRange.minTileCol, lastTileRange.maxTileCol, tileRange.minTileCol, tileRange.maxTileCol]
            : [lastTileRange.minTileRow, lastTileRange.maxTileRow, tileRange.minTileRow, tileRange.maxTileRow];

        if (currMin - 1 <= prevMax) {
          // merge with last
          const tileRangeLimits =
            width > height ? ([prevMin, tileIndex, currMax, tileIndex] as const) : ([tileIndex, prevMin, tileIndex, currMax] as const);
          const replacingTileRange = new TileRange(...tileRangeLimits, tileMatrixId, metatile);
          movingTileRanges.splice(movingTileRanges.length - 1, 1, replacingTileRange);
        } else {
          // add
          movingTileRanges.push(tileRange);
        }
      });

    tileRanges.push(...movingTileRanges);
  }

  return tileRanges;
}

/**
 * Finds the matching tile matrix in target tile matrix set based on the selected comparison method
 * @param tileMatrix source tile matrix
 * @param targetTileMatrixSet target tile matrix set
 * @param comparison comparison method
 * @throws error when matching scale could not be found
 * @returns matching tile matrix
 */
export function findMatchingTileMatrix<T extends TileMatrixSet>(
  tileMatrix: TileMatrix,
  targetTileMatrixSet: T,
  comparison: Comparison = 'equal'
): TileMatrixId<T> | undefined {
  validateTileMatrix(tileMatrix);
  // validateTileMatrixSet(targetTileMatrixSet); // TODO: currently not implemented

  const { scaleDenominator } = tileMatrix;

  const { tileMatrixId, diff } = targetTileMatrixSet.tileMatrices
    .sort((a, b) => b.scaleDenominator - a.scaleDenominator)
    .map(({ identifier: { code: tileMatrixId }, scaleDenominator: targetScaleDenominator }) => {
      return { tileMatrixId, diff: targetScaleDenominator - scaleDenominator };
    })
    .reduce((prevValue, { tileMatrixId, diff }) => {
      const { diff: prevDiff } = prevValue;

      switch (comparison) {
        case 'equal':
          if (diff === 0) {
            return { tileMatrixId, diff };
          }
          break;
        case 'closest':
          if (Math.abs(diff) < Math.abs(prevDiff)) {
            return { tileMatrixId, diff };
          }
          break;
        case 'lower':
          if (diff > 0 && diff < prevDiff) {
            return { tileMatrixId, diff };
          }
          break;
        case 'higher':
          if (diff < 0 && Math.abs(diff) < Math.abs(prevDiff)) {
            return { tileMatrixId, diff };
          }
          break;
      }

      return prevValue;
    });

  if ((comparison === 'equal' && diff !== 0) || (comparison === 'lower' && diff < 0) || (comparison === 'higher' && diff > 0)) {
    // could not find a match
    return undefined;
  }

  return tileMatrixId;
}

/**
 * Calculates bounding box for a tile matrix and input height and width
 * @param tileMatrix tile matrix
 * @param matrixHeight tile matrix height
 * @param matrixWidth tile matrix width
 * @returns bounding box
 */
export function tileMatrixToBoundingBox(
  tileMatrix: TileMatrix,
  matrixHeight: number = tileMatrix.matrixHeight,
  matrixWidth: number = tileMatrix.matrixWidth
): BoundingBox {
  validateTileMatrix(tileMatrix);

  if (matrixHeight < 0 || matrixWidth < 0) {
    throw new Error('tile matrix dimensions must be non-negative integers');
  }

  const { cellSize, pointOfOrigin, tileHeight, tileWidth, cornerOfOrigin = 'topLeft' } = tileMatrix;
  const [lonOrigin, latOrigin] = pointOfOrigin; // TODO: currently the axis order is assumed and not calculated
  const tileMatrixHeight = cellSize * tileHeight * matrixHeight;
  const tileMatrixWidth = cellSize * tileWidth * matrixWidth;

  const [minY, maxY] = cornerOfOrigin === 'topLeft' ? [latOrigin - tileMatrixHeight, latOrigin] : [latOrigin, latOrigin + tileMatrixHeight];
  const [minX, maxX] = [lonOrigin, lonOrigin + tileMatrixWidth];
  return new BoundingBox([minX, minY, maxX, maxY]);
}

/**
 * Find the minimal bounding tile containing the bounding box
 * @param boundingBox bounding box
 * @param tileMatrixSet tile matrix set for the containing tile lookup
 * @param metatile size of a metatile
 * @returns tile that fully contains the bounding box in a single tile or null if it could not be fully contained in any tile
 */
export function minimalBoundingTile<T extends TileMatrixSet>(boundingBox: BoundingBox, tileMatrixSet: TileMatrixSet, metatile = 1): Tile<T> | null {
  validateMetatile(metatile);

  const possibleBoundingTiles = tileMatrixSet.tileMatrices.map((tileMatrix) => {
    const boundingBoxFeature = geometryToFeature(boundingBox);
    const tileMatrixBoundingBoxFeature = geometryToFeature(tileMatrixToBoundingBox(tileMatrix));

    if (!booleanContains(boundingBoxFeature, tileMatrixBoundingBoxFeature)) {
      return null;
    }
    const { minTileCol, minTileRow, maxTileCol, maxTileRow } = boundingBox.toTileRange(tileMatrix, metatile);
    const {
      identifier: { code: tileMatrixId },
      scaleDenominator,
    } = tileMatrix;

    if (minTileCol === maxTileCol && minTileRow === maxTileRow) {
      return { tile: new Tile(minTileCol, minTileRow, tileMatrixId, metatile), scaleDenominator };
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

/**
 * Convert geometry to a set of tile ranges in the given tile matrix
 * @param geometry geometry to compute tile ranges for
 * @param tileMatrix tile matrix
 * @param metatile size of a metatile
 * @returns tile range in `tileMatrix`
 */
export function geometryToTileRanges<G extends GeoJSONGeometry, T extends TileMatrixSet>(
  geometry: Geometry<G>,
  tileMatrix: ArrayElement<T['tileMatrices']>,
  metatile = 1
): TileRange<T>[] {
  validateTileMatrix(tileMatrix);
  validateMetatile(metatile);
  validateGeometryByTileMatrix(geometry, tileMatrix);

  switch (true) {
    case geometry instanceof BoundingBox:
      return [geometry.toTileRange(tileMatrix, metatile)];
    case geometry instanceof Polygon:
      return polygonToTileRanges(geometry, tileMatrix, metatile);
    case geometry instanceof GeometryCollection: {
      const featurePolygons = geometry.geometries
        .flatMap(flatGeometryCollection)
        .filter((geometry): geometry is GeoJSONPolygon => geometry.type === 'Polygon' && Array.isArray(geometry.coordinates))
        .map((polygon) => feature(polygon));
      const dissolvedPolygons = dissolve(featureCollection(featurePolygons));
      const tileRanges = dissolvedPolygons.features.flatMap((geoJSONPolygonFeature) => {
        const polygon = new Polygon(geoJSONPolygonFeature.geometry.coordinates);
        return polygonToTileRanges(polygon, tileMatrix, metatile);
      });
      return tileRanges;
    }
    default:
      throw new Error(`unsupported geometry type: ${geometry.type}`);
  }
}

export function avoidNegativeZero(value: number): number {
  if (value === 0) {
    return 0;
  }
  return value;
}

export function clampValues(value: number, minValue: number, maxValue: number): number {
  if (value < minValue) {
    return minValue;
  }

  if (value > maxValue) {
    return maxValue;
  }

  return value;
}

export function tileEffectiveHeight(tileMatrix: TileMatrix): number {
  const { cellSize, tileHeight } = tileMatrix;
  return cellSize * tileHeight;
}

export function tileEffectiveWidth(tileMatrix: TileMatrix): number {
  const { cellSize, tileWidth } = tileMatrix;
  return cellSize * tileWidth;
}
