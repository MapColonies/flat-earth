import { area, dissolve, feature, featureCollection, intersect } from '@turf/turf';
import type { Polygon as GeoJSONPolygon } from 'geojson';
import { BoundingBox, GeoPoint, Geometry, GeometryCollection, Polygon } from '../classes';
import { geometryToBoundingBox } from '../converters/geometry_converters';
import { geometryToFeature } from '../converters/turf/turf_converters';
import type { GeoJSONGeometry, Zoom } from '../types';
import { flatGeometryCollection } from '../utilities';
import {
  validateBoundingBox,
  validateBoundingBoxByGrid,
  validateGeoPointByGrid,
  validateGeometryByGrid,
  validateMetatile,
  validateTileByGrid,
  validateTileGrid,
  validateZoomByGrid,
} from '../validations/validations';
import { Tile, TileGrid, TileIntersectionType, TileRange } from './tiles_classes';
import { SCALE_FACTOR, TILEGRID_WORLD_CRS84 } from './tiles_constants';

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

function tileEffectiveHeight(zoom: Zoom, referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84): number {
  return (
    (referenceTileGrid.boundingBox.max.lat - referenceTileGrid.boundingBox.min.lat) /
    (referenceTileGrid.numberOfMinLevelTilesY * SCALE_FACTOR ** zoom)
  );
}

function tileEffectiveWidth(zoom: Zoom, referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84): number {
  return (
    (referenceTileGrid.boundingBox.max.lon - referenceTileGrid.boundingBox.min.lon) /
    (referenceTileGrid.numberOfMinLevelTilesX * SCALE_FACTOR ** zoom)
  );
}

function polygonToTiles(polygon: Polygon, zoom: Zoom, metatile = 1, referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84): TileRange[] {
  const boundingBox = geometryToBoundingBox(polygon);
  const minimalZoom = minimalBoundingTile(boundingBox, metatile, referenceTileGrid)?.z ?? 0;
  const tileRange = boundingBoxToTileRange(boundingBox, Math.min(minimalZoom, zoom), metatile, referenceTileGrid);
  return polygonToTileRanges(polygon, tileRange, zoom, referenceTileGrid);
}

function polygonToTileRanges(polygon: Polygon, tileRange: TileRange, zoom: Zoom, referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84): TileRange[] {
  const tileRanges: TileRange[] = [];
  const partialTiles: Tile[] = [];

  for (const tile of tileRange.tileGenerator()) {
    const tileIntersectionType = polygonTileIntersection(polygon, tile);

    switch (tileIntersectionType) {
      case TileIntersectionType.FULL:
        tileRanges.push(tileToTileRange(tile, zoom, referenceTileGrid));
        break;
      case TileIntersectionType.PARTIAL:
        if (tile.z === zoom) {
          tileRanges.push(tileToTileRange(tile, zoom, referenceTileGrid));
        } else {
          partialTiles.push(tile);
        }
        break;
      case TileIntersectionType.NONE:
        break;
    }
  }

  for (const tile of partialTiles) {
    tileRanges.push(...polygonToTileRanges(polygon, tileToTileRange(tile, tile.z + 1, referenceTileGrid), zoom, referenceTileGrid));
  }

  return tileRanges;
}

/**
 * Calculates a tile for a longitude, latitude and zoom
 * @param geoPoint a point with longitude and latitude
 * @param zoom zoom level
 * @param reverseIntersectionPolicy a boolean whether to reverse the intersection policy (in cases that the location is on the edge of the tile)
 * @param metatile size of a metatile
 * @param referenceTileGrid a tile grid which the calculated tile belongs to
 */
function geoCoordsToTile(
  geoPoint: GeoPoint,
  zoom: Zoom,
  reverseIntersectionPolicy: boolean,
  metatile = 1,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): Tile {
  const width = tileEffectiveWidth(zoom, referenceTileGrid) * metatile;
  const height = tileEffectiveHeight(zoom, referenceTileGrid) * metatile;

  const x = (geoPoint.lon - referenceTileGrid.boundingBox.min.lon) / width;
  const y = (referenceTileGrid.boundingBox.max.lat - geoPoint.lat) / height;

  // When explicitly asked to reverse the intersection policy (location on the edge of the tile)
  if (reverseIntersectionPolicy) {
    const tileX = Math.ceil(x) - 1;
    const tileY = Math.ceil(y) - 1;
    return new Tile(tileX, tileY, zoom, metatile);
  }

  // When longitude/latitude is on the maximum edge of the tile grid (e.g. lon = 180 lat = 90 on the WG84 grid)
  const onEdgeXTranslation = geoPoint.lon === referenceTileGrid.boundingBox.max.lon ? 1 : 0;
  const onEdgeYTranslation = geoPoint.lat === referenceTileGrid.boundingBox.min.lat ? 1 : 0;

  const tileX = Math.floor(x) - onEdgeXTranslation;
  const tileY = Math.floor(y) - onEdgeYTranslation;

  return new Tile(tileX, tileY, zoom, metatile);
}

function snapMinPointToGrid(point: GeoPoint, zoom: Zoom, referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84): GeoPoint {
  const width = tileEffectiveWidth(zoom, referenceTileGrid);
  const minLon = Math.floor(point.lon / width) * width;
  const height = tileEffectiveHeight(zoom, referenceTileGrid);
  const minLat = Math.floor(point.lat / height) * height;
  return new GeoPoint(avoidNegativeZero(minLon), avoidNegativeZero(minLat));
}

function snapMaxPointToGrid(point: GeoPoint, zoom: Zoom, referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84): GeoPoint {
  const width = tileEffectiveWidth(zoom, referenceTileGrid);
  const maxLon = Math.ceil(point.lon / width) * width;
  const height = tileEffectiveHeight(zoom, referenceTileGrid);
  const maxLat = Math.ceil(point.lat / height) * height;
  return new GeoPoint(avoidNegativeZero(maxLon), avoidNegativeZero(maxLat));
}

/**
 * Creates a generator function which calculates tiles that intersect the bounding box
 * @param boundingBox the bounding box
 * @param zoom the zoom level
 * @param metatile the size of a metatile
 * @param referenceTileGrid a tile grid which the calculated tile belongs to
 * @returns generator function which calculates tiles that intersect the `boundingBox`
 */
export function boundingBoxToTileRange(
  boundingBox: BoundingBox,
  zoom: Zoom,
  metatile = 1,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): TileRange {
  validateMetatile(metatile);
  validateTileGrid(referenceTileGrid);
  validateBoundingBoxByGrid(boundingBox, referenceTileGrid);
  validateZoomByGrid(zoom, referenceTileGrid);

  const firstTile = geoCoordsToTile(new GeoPoint(boundingBox.min.lon, boundingBox.max.lat), zoom, false, metatile, referenceTileGrid);
  const lastTile = geoCoordsToTile(new GeoPoint(boundingBox.max.lon, boundingBox.min.lat), zoom, true, metatile, referenceTileGrid);

  return new TileRange(firstTile.x, firstTile.y, lastTile.x, lastTile.y, zoom, metatile);
}

/**
 * Calculates the matching zoom level between tile grids
 * @param zoom the zoom level
 * @param referenceTileGrid a source tile grid
 * @param targetTileGrid a target tile grid
 * @throws Error when there is no matching scales for equivalent zooms
 * @returns a matching zoom level
 */
export function zoomShift(zoom: Zoom, referenceTileGrid: TileGrid, targetTileGrid: TileGrid): Zoom {
  validateTileGrid(referenceTileGrid);
  validateTileGrid(targetTileGrid);
  validateZoomByGrid(zoom, referenceTileGrid);

  const scale = referenceTileGrid.wellKnownScaleSet.scaleDenominators.get(zoom);
  if (scale === undefined) {
    // the value is validated before so this should be unreachable
    throw new Error('zoom level is not part of the given well known scale set');
  }

  let matchingZoom: Zoom | undefined;
  for (const [targetZoom, targetScaleDenominator] of targetTileGrid.wellKnownScaleSet.scaleDenominators) {
    if (targetScaleDenominator === scale) {
      matchingZoom = targetZoom;
      break;
    }
  }

  if (matchingZoom === undefined) {
    throw new Error('no matching target scale found for the given zoom level');
  }

  return matchingZoom;
}

/**
 * Calculates a tile for longitude, latitude and zoom
 * @param geoPoint a point with longitude and latitude
 * @param zoom the zoom level
 * @param metatile the size of a metatile
 * @param referenceTileGrid a tile grid which the calculated tile belongs to
 * @returns tile within the tile grid
 */
export function geoPointZoomToTile(geoPoint: GeoPoint, zoom: Zoom, metatile = 1, referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84): Tile {
  validateMetatile(metatile);
  validateTileGrid(referenceTileGrid);
  validateZoomByGrid(zoom, referenceTileGrid);
  validateGeoPointByGrid(geoPoint, referenceTileGrid);

  return geoCoordsToTile(geoPoint, zoom, false, metatile, referenceTileGrid);
}

/**
 * Calculates a bounding box of a tile
 * @param tile the input tile
 * @param referenceTileGrid a tile grid which this tile belongs to
 * @param clamp a boolean whether to clamp the calculated bounding box to the tile grid's bounding box
 * @returns bounding box of the input `tile`
 */
export function tileToBoundingBox(tile: Tile, referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84, clamp = false): BoundingBox {
  validateTileGrid(referenceTileGrid);
  validateTileByGrid(tile, referenceTileGrid);
  const metatile = tile.metatile ?? 1;

  const width = tileEffectiveWidth(tile.z, referenceTileGrid) * metatile;
  const height = tileEffectiveHeight(tile.z, referenceTileGrid) * metatile;

  const boundingBox: BoundingBox = new BoundingBox([
    referenceTileGrid.boundingBox.min.lon + tile.x * width,
    referenceTileGrid.boundingBox.max.lat - (tile.y + 1) * height,
    referenceTileGrid.boundingBox.min.lon + (tile.x + 1) * width,
    referenceTileGrid.boundingBox.max.lat - tile.y * height,
  ]);

  if (clamp) {
    // clamp the values in cases where a metatile may extend tile bounding box beyond the bounding box
    // of the tile grid
    return new BoundingBox([
      clampValues(boundingBox.min.lon, referenceTileGrid.boundingBox.min.lon, referenceTileGrid.boundingBox.max.lon),
      clampValues(boundingBox.min.lat, referenceTileGrid.boundingBox.min.lat, referenceTileGrid.boundingBox.max.lat),
      clampValues(boundingBox.max.lon, referenceTileGrid.boundingBox.min.lon, referenceTileGrid.boundingBox.max.lon),
      clampValues(boundingBox.max.lat, referenceTileGrid.boundingBox.min.lat, referenceTileGrid.boundingBox.max.lat),
    ]);
  }

  return boundingBox;
}

/**
 * Converts tile to tile range in a higher zoom level
 * This method will help find what tiles are needed to cover a given tile at a different zoom level
 * @param tile
 * @param zoom target tile range zoom
 * @param referenceTileGrid tile grid
 * @returns tile range at the given zoom level
 */
export function tileToTileRange(tile: Tile, zoom: Zoom, referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84): TileRange {
  if (zoom < tile.z) {
    throw new Error(`Target zoom level ${zoom} must be higher or equal to the tile's zoom level ${tile.z}`);
  }

  const dz = zoom - tile.z;
  const scaleFactorBetweenTwoLevels = SCALE_FACTOR ** dz;
  const tileGridMaxX = Math.ceil((referenceTileGrid.numberOfMinLevelTilesX * SCALE_FACTOR ** zoom) / (tile.metatile ?? 1)) - 1;
  const tileGridMaxY = Math.ceil((referenceTileGrid.numberOfMinLevelTilesY * SCALE_FACTOR ** zoom) / (tile.metatile ?? 1)) - 1;
  const minX = tile.x * scaleFactorBetweenTwoLevels;
  const minY = tile.y * scaleFactorBetweenTwoLevels;
  const maxX = Math.min((tile.x + 1) * scaleFactorBetweenTwoLevels - 1, tileGridMaxX);
  const maxY = Math.min((tile.y + 1) * scaleFactorBetweenTwoLevels - 1, tileGridMaxY);

  return new TileRange(minX, minY, maxX, maxY, zoom, tile.metatile);
}

/**
 * Expands bounding box to the containing grid at a given zoom level
 * @param boundingBox bounding box to expand
 * @param zoom zoom level for the tile grid
 * @param referenceTileGrid tile grid
 * @returns bounding box that contains the input `boundingBox` and snapped to the tile grid
 */
export function expandBoundingBoxToTileGrid(boundingBox: BoundingBox, zoom: Zoom, referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84): BoundingBox {
  validateBoundingBox(boundingBox);
  validateZoomByGrid(zoom, referenceTileGrid);
  validateTileGrid(referenceTileGrid);
  validateBoundingBoxByGrid(boundingBox, referenceTileGrid);

  const minPoint = snapMinPointToGrid(boundingBox.min, zoom, referenceTileGrid);
  const maxPoint = snapMaxPointToGrid(boundingBox.max, zoom, referenceTileGrid);

  return new BoundingBox([minPoint.lon, minPoint.lat, maxPoint.lon, maxPoint.lat]);
}

/**
 * Find the minimal bounding tile containing the bounding box
 * @param boundingBox bounding box
 * @param referenceTileGrid tile grid
 * @returns tile that fully contains the bounding box in a single tile or null if it could not be fully contained in any tile
 */
export function minimalBoundingTile(boundingBox: BoundingBox, metatile = 1, referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84): Tile | null {
  validateBoundingBox(boundingBox);
  validateMetatile(metatile);
  validateTileGrid(referenceTileGrid);
  validateBoundingBoxByGrid(boundingBox, referenceTileGrid);

  const dx = boundingBox.max.lon - boundingBox.min.lon;
  const dy = boundingBox.max.lat - boundingBox.min.lat;

  const minimalXZoom = Math.floor(
    Math.log2(
      ((referenceTileGrid.boundingBox.max.lon - referenceTileGrid.boundingBox.min.lon) * metatile) / (referenceTileGrid.numberOfMinLevelTilesX * dx)
    )
  );

  const minimalYZoom = Math.floor(
    Math.log2(
      ((referenceTileGrid.boundingBox.max.lat - referenceTileGrid.boundingBox.min.lat) * metatile) / (referenceTileGrid.numberOfMinLevelTilesY * dy)
    )
  );

  const minimalZoom = Math.min(minimalXZoom, minimalYZoom);
  const minPoint = new GeoPoint(boundingBox.min.lon, boundingBox.max.lat);
  const maxPoint = new GeoPoint(boundingBox.max.lon, boundingBox.min.lat);

  for (let zoom = minimalZoom; zoom >= 0; zoom--) {
    const minTile = geoCoordsToTile(minPoint, zoom, false, metatile);
    const maxTile = geoCoordsToTile(maxPoint, zoom, true, metatile);

    if (minTile.x === maxTile.x && minTile.y === maxTile.y) {
      return minTile;
    }
  }

  return null;
}

/**
 * Convert a geometry to a set of tile ranges in the given zoom level
 * @param geometry geometry to compute tile ranges for
 * @param zoom target zoom level
 * @param metatile size of a metatile
 * @param referenceTileGrid tile grid
 * @returns tile range in the given zoom level
 */
export function geometryToTileRanges<G extends GeoJSONGeometry>(
  geometry: Geometry<G>,
  zoom: Zoom,
  metatile = 1,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): TileRange[] {
  validateTileGrid(referenceTileGrid);
  validateGeometryByGrid(geometry, referenceTileGrid);
  validateZoomByGrid(zoom, referenceTileGrid);

  switch (true) {
    case geometry instanceof BoundingBox:
      return [boundingBoxToTileRange(geometry, zoom, metatile, referenceTileGrid)];
    case geometry instanceof Polygon:
      return polygonToTiles(geometry, zoom, metatile, referenceTileGrid);
    case geometry instanceof GeometryCollection: {
      const featurePolygons = geometry.geometries
        .flatMap(flatGeometryCollection)
        .filter((geometry): geometry is GeoJSONPolygon => geometry.type === 'Polygon' && Array.isArray(geometry.coordinates))
        .map((polygon) => feature(polygon));
      const dissolvedPolygons = dissolve(featureCollection(featurePolygons));
      const tileRanges = dissolvedPolygons.features.flatMap((geoJSONPolygonFeature) => {
        const polygon = new Polygon(geoJSONPolygonFeature.geometry.coordinates);
        return polygonToTiles(polygon, zoom, metatile, referenceTileGrid);
      });
      return tileRanges;
    }
    default:
      throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }
}

/**
 * Identifies the intersection type between a polygon and a tile from a tile grid
 * @param polygon polygon to identify intersections with
 * @param tile target tile
 * @param referenceTileGrid tile grid
 * @returns intersection type between the geometry and the tile
 */
export function polygonTileIntersection(polygon: Polygon, tile: Tile, referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84): TileIntersectionType {
  validateTileGrid(referenceTileGrid);
  validateGeometryByGrid(polygon, referenceTileGrid);
  validateTileByGrid(tile, referenceTileGrid);

  const featurePolygon = geometryToFeature(polygon);
  const featureBoundingBox = geometryToFeature(tileToBoundingBox(tile, referenceTileGrid));
  const features = featureCollection([featurePolygon, featureBoundingBox]);
  const intersectionResult = intersect(features);

  if (intersectionResult === null) {
    return TileIntersectionType.NONE;
  } else {
    const intArea = area(intersectionResult);
    const hashArea = area(featureBoundingBox);
    if (intArea === hashArea) {
      return TileIntersectionType.FULL;
    }
    return TileIntersectionType.PARTIAL;
  }
}
