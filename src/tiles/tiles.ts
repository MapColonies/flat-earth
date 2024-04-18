import { BoundingBox } from '../classes';
import type { ArrayElement, Comparison } from '../types';
import { validateMetatile, validateTileMatrix } from '../validations/validations';
import { Tile } from './tile';
import type { TileMatrixSet } from './tileMatrixSet';
import type { TileMatrix, TileMatrixId } from './types';

// function polygonToTileRanges<T extends TileMatrixSet>(polygon: Polygon, tileMatrix: ArrayElement<T['tileMatrices']>, metatile = 1): TileRange<T>[] {
//   const tileRanges: TileRange<T>[] = [];
//   const boundingBox = polygon.toBoundingBox();

//   const { minTileCol, minTileRow, maxTileCol, maxTileRow } = boundingBox.toTileRange(tileMatrix, metatile);

//   const width = maxTileCol - minTileCol;
//   const height = maxTileRow - minTileRow;

//   const [minTileIndex, maxTileIndex]: [number, number] = width > height ? [minTileRow, maxTileRow] : [minTileCol, maxTileCol];

//   for (let tileIndex = minTileIndex; tileIndex <= maxTileIndex; tileIndex += 1) {
//     const tileRangeLimits =
//       width > height ? ([minTileCol, tileIndex, maxTileCol, tileIndex] as const) : ([tileIndex, minTileRow, tileIndex, maxTileRow] as const);

//     const movingTileRange = new TileRange(...tileRangeLimits, tileMatrix, metatile);

//     const movingTileRangeBoundingBox = geometryToFeature(movingTileRange.toBoundingBox(tileMatrix, true));
//     const intersections = intersect(featureCollection([geometryToFeature(polygon), movingTileRangeBoundingBox]));

//     if (intersections === null) {
//       return [];
//     }

//     const intersectingPolygons = flatten(intersections);
//     const movingTileRanges: TileRange<T>[] = [];
//     intersectingPolygons.features
//       .map((polygon) => {
//         const boundingBox = new BoundingBox({
//           bbox: bbox(polygon.geometry),
//           coordRefSys: '' // TODO: complete
//         });
//         const { minTileCol, minTileRow, maxTileCol, maxTileRow } = boundingBox.toTileRange(tileMatrix, metatile);
//         return new TileRange(minTileCol, minTileRow, maxTileCol, maxTileRow, tileMatrix, metatile);
//       })
//       .sort((a, b) => (width > height ? a.minTileRow - b.minTileRow : a.minTileCol - b.minTileCol))
//       .forEach((tileRange) => {
//         // eslint-disable-next-line @typescript-eslint/no-magic-numbers
//         const lastTileRange = movingTileRanges.at(-1);

//         if (!lastTileRange) {
//           movingTileRanges.push(tileRange);
//           return;
//         }

//         const [prevMin, prevMax, currMin, currMax] =
//           width > height
//             ? [lastTileRange.minTileCol, lastTileRange.maxTileCol, tileRange.minTileCol, tileRange.maxTileCol]
//             : [lastTileRange.minTileRow, lastTileRange.maxTileRow, tileRange.minTileRow, tileRange.maxTileRow];

//         if (currMin - 1 <= prevMax) {
//           // merge with last
//           const tileRangeLimits =
//             width > height ? ([prevMin, tileIndex, currMax, tileIndex] as const) : ([tileIndex, prevMin, tileIndex, currMax] as const);
//           const replacingTileRange = new TileRange(...tileRangeLimits, tileMatrix, metatile);
//           movingTileRanges.splice(movingTileRanges.length - 1, 1, replacingTileRange);
//         } else {
//           // add
//           movingTileRanges.push(tileRange);
//         }
//       });

//     tileRanges.push(...movingTileRanges);
//   }

//   return tileRanges;
// }

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
 * @param coordRefSys CRS of `tileMatrix`
 * @param matrixHeight tile matrix height
 * @param matrixWidth tile matrix width
 * @returns bounding box
 */
export function tileMatrixToBoundingBox<T extends TileMatrixSet>(
  tileMatrix: ArrayElement<T['tileMatrices']>,
  coordRefSys: T['crs'],
  matrixHeight: number = tileMatrix.matrixHeight,
  matrixWidth: number = tileMatrix.matrixWidth
): BoundingBox {
  validateTileMatrix(tileMatrix);

  if (matrixHeight < 0 || matrixWidth < 0) {
    throw new Error('tile matrix dimensions must be non-negative integers');
  }

  const { cellSize, pointOfOrigin, tileHeight, tileWidth, cornerOfOrigin = 'topLeft' } = tileMatrix;
  const [eastOrigin, northOrigin] = pointOfOrigin; // TODO: currently the axis order is assumed and not calculated
  const tileMatrixHeight = cellSize * tileHeight * matrixHeight;
  const tileMatrixWidth = cellSize * tileWidth * matrixWidth;

  const [minNorth, maxNorth] =
    cornerOfOrigin === 'topLeft' ? [northOrigin - tileMatrixHeight, northOrigin] : [northOrigin, northOrigin + tileMatrixHeight];
  const [minEast, maxEast] = [eastOrigin, eastOrigin + tileMatrixWidth];

  return new BoundingBox({
    bbox: [minEast, minNorth, maxEast, maxNorth],
    coordRefSys,
  });
}

// TODO: add implementation - GENERATOR OF "Thin" Tile data structure, MOVE IT TO GEOMETRY CLASS
// TODO: change implementation - MAKE IT GENERATOR OF TileMatrixLimit data structure, MOVE IT TO GEOMETRY CLASS
// /**
//  * Convert geometry to a set of tile ranges in the given tile matrix
//  * @param geometry geometry to compute tile ranges for
//  * @param tileMatrix tile matrix
//  * @param metatile size of a metatile
//  * @returns tile range in `tileMatrix`
//  */
// export function geometryToTileRanges<G extends JSONFGGeometry, T extends TileMatrixSet>(
//   geometry: Geometry<G>,
//   tileMatrix: ArrayElement<T['tileMatrices']>,
//   metatile = 1
// ): TileRange<T>[] {
//   validateTileMatrix(tileMatrix);
//   validateMetatile(metatile);
//   validateGeometryByTileMatrix(geometry, tileMatrix);

//   switch (true) {
//     case geometry instanceof BoundingBox:
//       return [geometry.toTileRange(tileMatrix, metatile)];
//     case geometry instanceof Polygon:
//       return polygonToTileRanges(geometry, tileMatrix, metatile);
//     case geometry instanceof GeometryCollection: {
//       const featurePolygons = geometry.geometries
//         .flatMap(flatGeometryCollection)
//         .filter((geometry): geometry is GeoJSONPolygon => geometry.type === 'Polygon' && Array.isArray(geometry.coordinates))
//         .map((polygon) => feature(polygon));
//       const dissolvedPolygons = dissolve(featureCollection(featurePolygons));
//       const tileRanges = dissolvedPolygons.features.flatMap((geoJSONPolygonFeature) => {
//         const polygon = new Polygon({
//           coordinates: geoJSONPolygonFeature.geometry.coordinates,
//           coordRefSys: '' // TODO: complete
//         });
//         return polygonToTileRanges(polygon, tileMatrix, metatile);
//       });
//       return tileRanges;
//     }
//     default:
//       throw new Error(`unsupported geometry type: ${geometry.type}`);
//   }
// }

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
