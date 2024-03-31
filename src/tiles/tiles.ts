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
  validateGeoPointByTileMatrix,
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

function clampValues(value: number, minValue: number, maxValue: number): number {
  if (value < minValue) {
    return minValue;
  }

  if (value > maxValue) {
    return maxValue;
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

  const { min: minBoundingBoxTile, max: maxBoundingBoxTile } = boundingBoxToTileBounds(boundingBox, tileMatrix, metatile);

  const width = maxBoundingBoxTile.col - minBoundingBoxTile.col;
  const height = maxBoundingBoxTile.row - minBoundingBoxTile.row;

  const [minTileIndex, maxTileIndex]: [number, number] =
    width > height ? [minBoundingBoxTile.row, maxBoundingBoxTile.row] : [minBoundingBoxTile.col, maxBoundingBoxTile.col];

  for (let tileIndex = minTileIndex; tileIndex <= maxTileIndex; tileIndex += 1) {
    const [minTileCol, minTileRow, maxTileCol, maxTileRow] =
      width > height
        ? [minBoundingBoxTile.col, tileIndex, maxBoundingBoxTile.col, tileIndex]
        : [tileIndex, minBoundingBoxTile.row, tileIndex, maxBoundingBoxTile.row];

    const movingTileRange = new TileRange(minTileCol, minTileRow, maxTileCol, maxTileRow, tileMatrixId, metatile);

    const movingTileRangeBoundingBox = geometryToFeature(tileRangeToBoundingBox(movingTileRange, tileMatrix, true));
    const intersections = intersect(featureCollection([geometryToFeature(polygon), movingTileRangeBoundingBox]));

    if (intersections === null) {
      return [];
    }

    const intersectingPolygons = flatten(intersections);
    intersectingPolygons.features.map((polygon) => {
      const boundingBox = new BoundingBox(bbox(polygon.geometry));
      const { min: minTile, max: maxTile } = boundingBoxToTileBounds(boundingBox, tileMatrix, metatile);
      tileRanges.push(new TileRange(minTile.col, minTile.row, maxTile.col, maxTile.row, tileMatrixId, metatile));
    });
  }

  return tileRanges;
}

function tileToGeoCoords<T extends TileMatrixSet>(tile: Tile<T>, tileMatrix: ArrayElement<T['tileMatrices']>): GeoPoint {
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

function tileRangeToBoundingBox<T extends TileMatrixSet>(
  tileRange: TileRange<T>,
  tileMatrix: ArrayElement<T['tileMatrices']>,
  clamp = false
): BoundingBox {
  const { maxCol, maxRow, metatile, minCol, minRow, tileMatrixId } = tileRange;

  const { lon, lat } = tileToGeoCoords(new Tile(minCol, minRow, tileMatrixId), tileMatrix);

  const boundingBox = tileMatrixToBoundingBox(
    { ...tileMatrix, pointOfOrigin: [lon, lat] },
    (maxRow - minRow) * metatile + 1,
    (maxCol - minCol) * metatile + 1
  );

  if (clamp) {
    // clamp the values in cases where a metatile may extend tile bounding box beyond the bounding box
    // of the tile matrix
    const { min: tileMatrixBoundingBoxMin, max: tileMatrixBoundingBoxMax } = tileMatrixToBoundingBox(tileMatrix);
    return new BoundingBox([
      clampValues(boundingBox.min.lon, tileMatrixBoundingBoxMin.lon, tileMatrixBoundingBoxMax.lon),
      clampValues(boundingBox.min.lat, tileMatrixBoundingBoxMin.lat, tileMatrixBoundingBoxMax.lat),
      clampValues(boundingBox.max.lon, tileMatrixBoundingBoxMin.lon, tileMatrixBoundingBoxMax.lon),
      clampValues(boundingBox.max.lat, tileMatrixBoundingBoxMin.lat, tileMatrixBoundingBoxMax.lat),
    ]);
  }

  return boundingBox;
}

/**
 * Calculates a tile for a longitude, latitude and tile matrix
 * @param geoPoint point with longitude and latitude
 * @param tileMatrix tile matrix which the calculated tile belongs to
 * @param reverseIntersectionPolicy boolean value whether to reverse the intersection policy (in cases that the location is on the edge of the tile)
 * @param metatile size of a metatile
 */
function geoCoordsToTile<T extends TileMatrixSet>(
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

function boundingBoxToTileBounds<T extends TileMatrixSet>(
  boundingBox: BoundingBox,
  tileMatrix: ArrayElement<T['tileMatrices']>,
  metatile = 1
): { min: Tile<T>; max: Tile<T> } {
  const { cornerOfOrigin } = tileMatrix;

  const minTilePoint = new GeoPoint(boundingBox.min.lon, cornerOfOrigin === 'topLeft' ? boundingBox.max.lat : boundingBox.min.lat);
  const maxTilePoint = new GeoPoint(boundingBox.max.lon, cornerOfOrigin === 'topLeft' ? boundingBox.min.lat : boundingBox.max.lat);

  return {
    min: geoCoordsToTile(minTilePoint, tileMatrix, false, metatile),
    max: geoCoordsToTile(maxTilePoint, tileMatrix, true, metatile),
  };
}

/**
 * extracts a tile matrix from a tile matrix set
 * @param tileMatrixId identifier of a tile matrix inside `tileMatrixSet`
 * @param tileMatrixSet tile matrix set
 * @returns tile matrix or `undefined` if `identifier` was not found in `tileMatrixSet`
 */
export function getTileMatrix<T extends TileMatrixSet>(tileMatrixId: TileMatrixId<T>, tileMatrixSet: T): TileMatrix | undefined {
  return tileMatrixSet.tileMatrices.find(({ identifier: { code: comparedTileMatrixId } }) => comparedTileMatrixId === tileMatrixId);
}

/**
 * Calculates tile range that covers the bounding box
 * @param boundingBox bounding box
 * @param tileMatrix tile matrix
 * @param metatile size of a metatile
 * @returns tile range that covers the `boundingBox`
 */
export function boundingBoxToTileRange<T extends TileMatrixSet>(
  boundingBox: BoundingBox,
  tileMatrix: ArrayElement<T['tileMatrices']>,
  metatile = 1
): TileRange<T> {
  validateMetatile(metatile);
  validateTileMatrix(tileMatrix);
  validateBoundingBoxByTileMatrix(boundingBox, tileMatrix);

  const { min: minTile, max: maxTile } = boundingBoxToTileBounds(boundingBox, tileMatrix, metatile);
  return new TileRange(minTile.col, minTile.row, maxTile.col, maxTile.row, tileMatrix.identifier.code, metatile);
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
 * Calculates a tile for longitude, latitude and tile matrix
 * @param geoPoint point with longitude and latitude
 * @param tileMatrix tile matrix which the calculated tile belongs to
 * @param metatile size of a metatile
 * @returns tile within the tile matrix
 */
export function geoPointToTile<T extends TileMatrixSet>(geoPoint: GeoPoint, tileMatrix: ArrayElement<T['tileMatrices']>, metatile = 1): Tile<T> {
  validateMetatile(metatile);
  validateTileMatrix(tileMatrix);
  validateGeoPointByTileMatrix(geoPoint, tileMatrix);

  return geoCoordsToTile(geoPoint, tileMatrix, false, metatile);
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
  return cornerOfOrigin === 'topLeft'
    ? new BoundingBox([lonOrigin, latOrigin - tileMatrixHeight, lonOrigin + tileMatrixWidth, latOrigin])
    : new BoundingBox([lonOrigin, latOrigin, lonOrigin + tileMatrixWidth, latOrigin + tileMatrixHeight]);
}

/**
 * Calculates a point with longitude and latitude for a tile in a tile matrix
 * @param tile tile within the tile matrix
 * @param tileMatrix tile matrix which the tile belongs to
 * @returns point with longitude and latitude of the origin of the tile, determined by `cornerOfOrigin` property of the tile matrix
 */
export function tileToGeoPoint<T extends TileMatrixSet>(tile: Tile<T>, tileMatrix: ArrayElement<T['tileMatrices']>): GeoPoint {
  validateTileMatrix(tileMatrix);
  validateTileByTileMatrix(tile, tileMatrix);

  const geoPoint = tileToGeoCoords(tile, tileMatrix);
  return geoPoint;
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
  const tileBoundingBox = tileRangeToBoundingBox(tileRange, tileMatrix, clamp);

  return tileBoundingBox;
}

/**
 * Converts tile to tile range in any tile matrix
 * This method will help find what tiles are needed to cover a given tile at a different tile matrix
 * @param tile tile
 * @param tileMatrix tile matrix
 * @param targetTileMatrix target tile matrix
 * @returns tile range at the given tile matrix
 */
export function tileToTileRange<T extends TileMatrixSet>(
  tile: Tile<T>,
  tileMatrix: ArrayElement<T['tileMatrices']>,
  targetTileMatrix: ArrayElement<T['tileMatrices']>
): TileRange<T> {
  validateTileMatrix(tileMatrix);
  validateTileMatrix(targetTileMatrix);

  const { metatile = 1 } = tile;
  const {
    identifier: { code: targetTileMatrixId },
  } = targetTileMatrix;

  const { min: minTilePoint, max: maxTilePoint } = tileToBoundingBox(tile, tileMatrix);

  const { col: minCol, row: minRow } = geoCoordsToTile(minTilePoint, targetTileMatrix, false, metatile);
  const { col: maxCol, row: maxRow } = geoCoordsToTile(maxTilePoint, targetTileMatrix, true, metatile);

  return new TileRange(minCol, minRow, maxCol, maxRow, targetTileMatrixId, metatile);
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

    const { min: minTile, max: maxTile } = boundingBoxToTileBounds(boundingBox, tileMatrix, metatile);
    const { scaleDenominator } = tileMatrix;

    if (minTile.col === maxTile.col && minTile.row === maxTile.row) {
      return { tile: minTile, scaleDenominator };
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
      return [boundingBoxToTileRange(geometry, tileMatrix, metatile)];
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
