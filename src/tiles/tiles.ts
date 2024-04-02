import { bbox, booleanContains, dissolve, feature, featureCollection, flatten, intersect } from '@turf/turf';
import type { Polygon as GeoJSONPolygon } from 'geojson';
import { BoundingBox, GeoPoint, Geometry, GeometryCollection, Polygon } from '../classes';
import { geometryToBoundingBox } from '../converters/geometry';
import { geometryToFeature } from '../converters/turf';
import type { ArrayElement, Comparison, GeoJSONGeometry, TileMatrixId } from '../types';
import { flatGeometryCollection } from '../utilities';
import {
  validateBoundingBox,
  validateBoundingBoxByTileMatrix,
  validateGeometryByTileMatrix,
  validateMetatile,
  validateTileByTileMatrix,
  validateTileMatrix,
} from '../validations/validations';
import { Tile } from './tile';
import type { TileMatrixSet } from './tileMatrixSet';
import { TileRange } from './tileRange';
import type { TileMatrix } from './types';

function avoidNegativeZero(value: number): number {
  if (value === 0) {
    return 0;
  }
  return value;
}

function tileEffectiveHeight(tileMatrix: TileMatrix): number {
  const { cellSize, matrixHeight, tileHeight } = tileMatrix;
  return (cellSize * tileHeight) / matrixHeight;
}

function tileEffectiveWidth(tileMatrix: TileMatrix): number {
  const { cellSize, matrixWidth, tileWidth } = tileMatrix;
  return (cellSize * tileWidth) / matrixWidth;
}

function polygonToTileRanges<T extends TileMatrixSet>(polygon: Polygon, tileMatrix: ArrayElement<T['tileMatrices']>, metatile = 1): TileRange<T>[] {
  const tileRanges: TileRange<T>[] = [];
  const boundingBox = geometryToBoundingBox(polygon);
  const {
    identifier: { code: tileMatrixId },
  } = tileMatrix;

  const { minTileCol, minTileRow, maxTileCol, maxTileRow } = boundingBox.toTileRange(tileMatrix, metatile);

  const width = maxTileCol - minTileCol;
  const height = maxTileRow - minTileRow;

  const [minTileIndex, maxTileIndex]: [number, number] = width > height ? [minTileRow, maxTileRow] : [minTileCol, maxTileCol];

  for (let tileIndex = minTileIndex; tileIndex <= maxTileIndex; tileIndex += 1) {
    const [minMovingTileCol, minMovingTileRow, maxMovingTileCol, maxMovingTileRow] =
      width > height ? [minTileCol, tileIndex, maxTileCol, tileIndex] : [tileIndex, minTileRow, tileIndex, maxTileRow];

    const movingTileRange = new TileRange(minMovingTileCol, minMovingTileRow, maxMovingTileCol, maxMovingTileRow, tileMatrixId, metatile);

    const movingTileRangeBoundingBox = geometryToFeature(movingTileRange.toBoundingBox(tileMatrix, true));
    const intersections = intersect(featureCollection([geometryToFeature(polygon), movingTileRangeBoundingBox]));

    if (intersections === null) {
      return [];
    }

    const intersectingPolygons = flatten(intersections);
    intersectingPolygons.features.map((polygon) => {
      const boundingBox = new BoundingBox(bbox(polygon.geometry));
      const { minTileCol, minTileRow, maxTileCol, maxTileRow } = boundingBox.toTileRange(tileMatrix, metatile);
      tileRanges.push(new TileRange(minTileCol, minTileRow, maxTileCol, maxTileRow, tileMatrixId, metatile));
    });
  }

  return tileRanges;
}

function snapMinPointToTileMatrix(point: GeoPoint, tileMatrix: TileMatrix): GeoPoint {
  const width = tileEffectiveWidth(tileMatrix);
  const minLon = Math.floor(point.lon / width) * width;
  const height = tileEffectiveHeight(tileMatrix);
  const minLat = Math.floor(point.lat / height) * height;
  return new GeoPoint(avoidNegativeZero(minLon), avoidNegativeZero(minLat));
}

function snapMaxPointToTileMatrix(point: GeoPoint, tileMatrix: TileMatrix): GeoPoint {
  const width = tileEffectiveWidth(tileMatrix);
  const maxLon = Math.ceil(point.lon / width) * width;
  const height = tileEffectiveHeight(tileMatrix);
  const maxLat = Math.ceil(point.lat / height) * height;
  return new GeoPoint(avoidNegativeZero(maxLon), avoidNegativeZero(maxLat));
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
 * Calculates a bounding box of a tile
 * @param tile the input tile
 * @param tileMatrixSet a tile matrix containing the tile
 * @param clamp a boolean whether to clamp the calculated bounding box to the tile matrix's bounding box
 * @returns bounding box of the input `tile`
 */
export function tileToBoundingBox<T extends TileMatrixSet>(tile: Tile<T>, tileMatrix: ArrayElement<T['tileMatrices']>, clamp = false): BoundingBox {
  validateTileMatrix(tileMatrix);
  validateTileByTileMatrix(tile, tileMatrix);

  const { col, row, tileMatrixId, metatile = 1 } = tile;
  const tileRange = new TileRange(col, row, col, row, tileMatrixId, metatile);
  const tileBoundingBox = tileRange.toBoundingBox(tileMatrix, clamp);

  return tileBoundingBox;
}

/**
 * Expands bounding box to the containing tile matrix
 * @param boundingBox bounding box to expand
 * @param tileMatrix tile matrix
 * @returns bounding box that contains the input `boundingBox` snapped to the tile matrix tiles
 */
export function expandBoundingBoxToTileMatrix(boundingBox: BoundingBox, tileMatrix: TileMatrix): BoundingBox {
  validateBoundingBox(boundingBox);
  validateTileMatrix(tileMatrix);
  validateBoundingBoxByTileMatrix(boundingBox, tileMatrix);

  const minPoint = snapMinPointToTileMatrix(boundingBox.min, tileMatrix);
  const maxPoint = snapMaxPointToTileMatrix(boundingBox.max, tileMatrix);

  return new BoundingBox([minPoint.lon, minPoint.lat, maxPoint.lon, maxPoint.lat]);
}

/**
 * Find the minimal bounding tile containing the bounding box
 * @param boundingBox bounding box
 * @param tileMatrixSet tile matrix set for the containing tile lookup
 * @param metatile size of a metatile
 * @returns tile that fully contains the bounding box in a single tile or null if it could not be fully contained in any tile
 */
export function minimalBoundingTile<T extends TileMatrixSet>(boundingBox: BoundingBox, tileMatrixSet: TileMatrixSet, metatile = 1): Tile<T> | null {
  validateBoundingBox(boundingBox);
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

export function clampValues(value: number, minValue: number, maxValue: number): number {
  if (value < minValue) {
    return minValue;
  }

  if (value > maxValue) {
    return maxValue;
  }

  return value;
}

export function tileToGeoCoords<T extends TileMatrixSet>(tile: Tile<T>, tileMatrix: ArrayElement<T['tileMatrices']>): GeoPoint {
  const { col, row, metatile = 1 } = tile;
  const width = tileEffectiveWidth(tileMatrix) * metatile;
  const height = tileEffectiveHeight(tileMatrix) * metatile;

  const {
    pointOfOrigin: [originX, originY],
    cornerOfOrigin = 'topLeft',
  } = tileMatrix;

  const lon = originX + col * width;
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const lat = originY + (cornerOfOrigin === 'topLeft' ? -1 : 1) * row * height;

  return new GeoPoint(lon, lat);
}

/**
 * Calculates a tile for a longitude, latitude and tile matrix
 * @param geoPoint point with longitude and latitude
 * @param tileMatrix tile matrix which the calculated tile belongs to
 * @param reverseIntersectionPolicy boolean value whether to reverse the intersection policy (in cases that the location is on the edge of the tile)
 * @param metatile size of a metatile
 */
export function geoCoordsToTile<T extends TileMatrixSet>(
  geoPoint: GeoPoint,
  tileMatrix: ArrayElement<T['tileMatrices']>,
  reverseIntersectionPolicy: boolean,
  metatile = 1
): Tile<T> {
  const width = tileEffectiveWidth(tileMatrix) * metatile;
  const height = tileEffectiveHeight(tileMatrix) * metatile;

  const { min: tileMatrixBoundingBoxMin, max: tileMatrixBoundingBoxMax } = tileMatrixToBoundingBox(tileMatrix);

  const {
    identifier: { code: tileMatrixId },
    cornerOfOrigin = 'topLeft',
  } = tileMatrix;

  const x = (geoPoint.lon - tileMatrixBoundingBoxMin.lon) / width;
  const y = (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMax.lat - geoPoint.lat : geoPoint.lat - tileMatrixBoundingBoxMin.lat) / height;

  // When explicitly asked to reverse the intersection policy (location on the edge of the tile)
  if (reverseIntersectionPolicy) {
    const tileCol = Math.ceil(x) - 1;
    const tileRow = Math.ceil(y) - 1;
    return new Tile(tileCol, tileRow, tileMatrixId, metatile);
  }

  // When longitude/latitude is on the maximum edge of the tile matrix (e.g. lon = 180 lat = 90)
  const onEdgeXTranslation = geoPoint.lon === tileMatrixBoundingBoxMax.lon ? 1 : 0;
  const onEdgeYTranslation = geoPoint.lat === (cornerOfOrigin === 'topLeft' ? tileMatrixBoundingBoxMin.lat : tileMatrixBoundingBoxMax.lat) ? 1 : 0;

  const tileCol = Math.floor(x) - onEdgeXTranslation;
  const tileRow = Math.floor(y) - onEdgeYTranslation;

  return new Tile(tileCol, tileRow, tileMatrixId, metatile);
}
