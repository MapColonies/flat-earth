import {SCALE_FACTOR, TILEGRID_WORLD_CRS84} from './tiles_constants';
import {BoundingBox, Geometry, LonLat, Polygon} from '../classes';
import {Tile, TileGrid, TileIntersectionType, TileRange} from './tiles_classes';
import {Zoom} from '../types';
import {
  validateLonlat,
  validateMetatile,
  validateTile,
  validateTileGrid,
  validateTileGridBoundingBox,
  validateZoomLevel,
} from './validations';
import {geometryToBoundingBox} from '../converters/geometry_converters';
import {
  boundingBoxToTurfBbox,
  polygonToTurfPolygon,
} from '../converters/turf/turf_converters';
import {area as turfArea, featureCollection, intersect} from '@turf/turf';

function clampValues(
  value: number,
  minValue: number,
  maxValue: number
): number {
  if (value < minValue) {
    return minValue;
  }

  if (value > maxValue) {
    return maxValue;
  }

  return value;
}

export function tileProjectedHeight(
  zoom: Zoom,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): number {
  return (
    (referenceTileGrid.boundingBox.max.lat -
      referenceTileGrid.boundingBox.min.lat) /
    (referenceTileGrid.numberOfMinLevelTilesY * SCALE_FACTOR ** zoom)
  );
}

function tileProjectedWidth(zoom: Zoom, referenceTileGrid: TileGrid): number {
  return (
    (referenceTileGrid.boundingBox.max.lon -
      referenceTileGrid.boundingBox.min.lon) /
    (referenceTileGrid.numberOfMinLevelTilesX * SCALE_FACTOR ** zoom)
  );
}

/**
 * Transforms a longitude and latitude to a tile coordinates
 * @param lonlat the longitude and latitude
 * @param zoom the zoom level
 * @param metatile the size of a metatile
 * @param reverseIntersectionPolicy a boolean whether to reverse the intersection policy (in cases that the location is on the edge of the tile)
 * @param referenceTileGrid a tile grid which the calculated tile belongs to
 */
function geoCoordsToTile(
  lonlat: LonLat,
  zoom: Zoom,
  metatile = 1,
  reverseIntersectionPolicy: boolean,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): Tile {
  const width = tileProjectedWidth(zoom, referenceTileGrid) * metatile;
  const height = tileProjectedHeight(zoom, referenceTileGrid) * metatile;

  const tileX = (lonlat.lon - referenceTileGrid.boundingBox.min.lon) / width;
  const tileY = (referenceTileGrid.boundingBox.max.lat - lonlat.lat) / height;

  // When explicitly asked to reverse the intersection policy, (location on the edge of the tile)
  // or in cases when lon/lat is on the edge of the grid (e.g. lon = 180 lat = 90 on the WG84 grid)
  if (reverseIntersectionPolicy || edgeOfMap(lonlat, referenceTileGrid)) {
    const x = Math.ceil(tileX) - 1;
    const y = Math.ceil(tileY) - 1;
    return new Tile(x, y, zoom, metatile);
  } else {
    const x = Math.floor(tileX);
    const y = Math.floor(tileY);
    return new Tile(x, y, zoom, metatile);
  }
}

/**
 * Check if the given location is on the edge of the tile grid
 * @param lonlat
 * @param referenceTileGrid
 */
function edgeOfMap(lonlat: LonLat, referenceTileGrid: TileGrid): boolean {
  return (
    lonlat.lon === referenceTileGrid.boundingBox.max.lon ||
    lonlat.lat === referenceTileGrid.boundingBox.min.lat
  );
}

/**
 * Creates a generator function which calculates a tile within a bounding box
 * @param bbox the bounding box
 * @param zoom the zoom level
 * @param metatile the size of a metatile
 * @param referenceTileGrid a tile grid which the calculated tile belongs to
 * @returns generator function which calculates tiles within the `bbox`
 */
export function boundingBoxToTileRange(
  bbox: BoundingBox,
  zoom: Zoom,
  metatile = 1,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): TileRange {
  validateMetatile(metatile);
  validateTileGrid(referenceTileGrid);
  validateTileGridBoundingBox(bbox, referenceTileGrid);
  validateZoomLevel(zoom, referenceTileGrid);

  const firstTile = geoCoordsToTile(
    new LonLat(bbox.min.lon, bbox.max.lat),
    zoom,
    metatile,
    false,
    referenceTileGrid
  );
  const lastTile = geoCoordsToTile(
    new LonLat(bbox.max.lon, bbox.min.lat),
    zoom,
    metatile,
    true,
    referenceTileGrid
  );

  return new TileRange(
    firstTile.x,
    firstTile.y,
    lastTile.x,
    lastTile.y,
    zoom,
    metatile
  );
}

/**
 * Calculates the matching zoom level between tile grids
 * @param zoom the zoom level
 * @param referenceTileGrid a source tile grid
 * @param targetTileGrid a target tile grid
 * @throws Error when there is no matching scales for equivalent zooms
 * @returns a matching zoom level
 */
export function zoomShift(
  zoom: Zoom,
  referenceTileGrid: TileGrid,
  targetTileGrid: TileGrid
): Zoom {
  validateTileGrid(referenceTileGrid);
  validateTileGrid(targetTileGrid);
  validateZoomLevel(zoom, referenceTileGrid);

  const scale = referenceTileGrid.wellKnownScaleSet.scaleDenominators.get(zoom);
  if (scale === undefined) {
    // the value is validated before so this should be unreachable
    throw new Error('zoom level is not part of the given well known scale set');
  }

  let matchingZoom: Zoom | undefined;
  for (const [targetZoom, targetScaleDenominator] of targetTileGrid
    .wellKnownScaleSet.scaleDenominators) {
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
 * Calculates a tile for a longtitude, latitude and zoom
 * @param lonlat a longtitude and latitude
 * @param zoom the zoom level
 * @param metatile the size of a metatile
 * @param referenceTileGrid a tile grid which the calculated tile belongs to
 * @returns tile within the tile grid by the input values of `lonlat` and `zoom`
 */
export function lonLatZoomToTile(
  lonlat: LonLat,
  zoom: Zoom,
  metatile = 1,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): Tile {
  validateMetatile(metatile);
  validateTileGrid(referenceTileGrid);
  validateZoomLevel(zoom, referenceTileGrid);
  validateLonlat(lonlat, referenceTileGrid);

  return geoCoordsToTile(lonlat, zoom, metatile, false, referenceTileGrid);
}

/**
 * Calculates a bounding box of a tile
 * @param tile the input tile
 * @param referenceTileGrid a tile grid which this tile belongs to
 * @param clamp a boolean whether to clamp the calculated bounding box to the tile grid's bounding box
 * @returns bounding box of the input `tile`
 */
export function tileToBoundingBox(
  tile: Tile,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84,
  clamp = false
): BoundingBox {
  validateTileGrid(referenceTileGrid);
  validateTile(tile, referenceTileGrid);
  const metatile = tile.metatile ?? 1;

  const width = tileProjectedWidth(tile.z, referenceTileGrid) * metatile;
  const height = tileProjectedHeight(tile.z, referenceTileGrid) * metatile;

  let bbox: BoundingBox = new BoundingBox(
    referenceTileGrid.boundingBox.min.lon + tile.x * width,
    referenceTileGrid.boundingBox.max.lat - (tile.y + 1) * height,
    referenceTileGrid.boundingBox.min.lon + (tile.x + 1) * width,
    referenceTileGrid.boundingBox.max.lat - tile.y * height
  );

  if (clamp) {
    // clamp the values in cases where a metatile may extend tile bounding box beyond the bounding box
    // of the tile grid
    bbox = new BoundingBox(
      clampValues(
        bbox.min.lon,
        referenceTileGrid.boundingBox.min.lon,
        referenceTileGrid.boundingBox.max.lon
      ),
      clampValues(
        bbox.min.lat,
        referenceTileGrid.boundingBox.min.lat,
        referenceTileGrid.boundingBox.max.lat
      ),
      clampValues(
        bbox.max.lon,
        referenceTileGrid.boundingBox.min.lon,
        referenceTileGrid.boundingBox.max.lon
      ),
      clampValues(
        bbox.max.lat,
        referenceTileGrid.boundingBox.min.lat,
        referenceTileGrid.boundingBox.max.lat
      )
    );
  }

  return bbox;
}

/**
 * converts tile to tile range in a higher zoom level
 * This method will help finding what tiles are needed to cover a given tile at a different zoom level
 * @param tile
 * @param zoom target tile range zoom
 * @returns the first tile of the tile range and the last tile of the tile range
 */
export function tileToTileRange(tile: Tile, zoom: Zoom): TileRange {
  if (zoom < tile.z) {
    throw new Error(
      `Target zoom level ${zoom} must be higher or equal to the tile's zoom level ${tile.z}`
    );
  }
  const dz = zoom - tile.z;
  const scaleFactor = Math.pow(2, dz);
  const minX = tile.x * scaleFactor;
  const minY = tile.y * scaleFactor;
  const maxX = (tile.x + 1) * scaleFactor - 1;
  const maxY = (tile.y + 1) * scaleFactor - 1;
  return new TileRange(minX, minY, maxX, maxY, zoom);
}

/**
 * rounds bbox to grid
 * @param boundingBox
 * @param zoom target tiles grid zoom level
 * @param referenceTileGrid
 * @returns bbox that contains the original bbox and match tile grid lines
 */
export function expandBBoxToTileGrid(
  boundingBox: BoundingBox,
  zoom: Zoom,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): BoundingBox {
  const minPoint = snapMinPointToGrid(boundingBox.min, zoom, referenceTileGrid);
  const maxPoint = snapMaxPointToGrid(boundingBox.max, zoom, referenceTileGrid);

  return new BoundingBox(
    minPoint.lon,
    minPoint.lat,
    maxPoint.lon,
    maxPoint.lat
  );
}

function snapMinPointToGrid(
  point: LonLat,
  zoom: Zoom,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): LonLat {
  const width = tileProjectedWidth(zoom, referenceTileGrid);
  const minLon = Math.floor(point.lon / width) * width;
  const height = tileProjectedHeight(zoom, referenceTileGrid);
  const minLat = Math.floor(point.lat / height) * height;
  return new LonLat(avoidNegativeZero(minLon), avoidNegativeZero(minLat));
}

function snapMaxPointToGrid(
  point: LonLat,
  zoom: Zoom,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): LonLat {
  const width = tileProjectedWidth(zoom, referenceTileGrid);
  const maxLon = Math.ceil(point.lon / width) * width;
  const height = tileProjectedHeight(zoom, referenceTileGrid);
  const maxLat = Math.ceil(point.lat / height) * height;
  return new LonLat(avoidNegativeZero(maxLon), avoidNegativeZero(maxLat));
}

function avoidNegativeZero(value: number): number {
  if (value === 0) {
    return 0;
  }

  return value;
}

/**
 * Find the minimal zoom where a bounding box can be contained in one tile
 * @param boundingBox
 * @param referenceTileGrid
 */
export function findMinimalZoom(
  boundingBox: BoundingBox,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): Zoom {
  const dx = boundingBox.max.lon - boundingBox.min.lon;
  const dy = boundingBox.max.lat - boundingBox.min.lat;

  const minimalXZoom = Math.floor(
    Math.log2(
      (referenceTileGrid.boundingBox.max.lon -
        referenceTileGrid.boundingBox.min.lon) /
        (referenceTileGrid.numberOfMinLevelTilesX * dx)
    )
  );

  const minimalYZoom = Math.floor(
    Math.log2(
      (referenceTileGrid.boundingBox.max.lat -
        referenceTileGrid.boundingBox.min.lat) /
        (referenceTileGrid.numberOfMinLevelTilesY * dy)
    )
  );

  const minimalZoom = Math.min(minimalXZoom, minimalYZoom);
  // Sometimes zoom can be negative, which is not valid
  let resultZoom = 0;
  // in cases the tile is not exactly fitting in the tile grid we need to check concrete cases
  for (let zoom = minimalZoom; zoom > 0; zoom--) {
    const tileRange = boundingBoxToTileRange(boundingBox, zoom);
    if (
      tileRange.maxX === tileRange.minX &&
      tileRange.maxY === tileRange.minY
    ) {
      resultZoom = zoom;
      break;
    }
  }

  return resultZoom;
}

/**
 * Convert a geometry to a set of tile ranges in the requested zoom level
 * @param geometry
 * @param zoom
 * @param referenceTileGrid
 */
export function geometryToTiles(
  geometry: Geometry,
  zoom: Zoom,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): TileRange[] {
  switch (geometry.type) {
    case 'Polygon':
      return polygonToTiles(geometry as Polygon, zoom, referenceTileGrid);
    case 'BoundingBox':
      return [
        boundingBoxToTileRange(
          geometry as BoundingBox,
          zoom,
          1,
          referenceTileGrid
        ),
      ];
    default:
      throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }
}

export function polygonTileIntersection(
  geometry: Polygon,
  tile: Tile,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): TileIntersectionType {
  const turfGeometry = polygonToTurfPolygon(geometry);
  const turfBoundingBox = boundingBoxToTurfBbox(
    tileToBoundingBox(tile, referenceTileGrid)
  );
  const features = featureCollection([turfGeometry, turfBoundingBox]);
  const intersectionResult = intersect(features);
  if (intersectionResult === null) {
    return TileIntersectionType.NONE;
  } else {
    const intArea = turfArea(intersectionResult);
    const hashArea = turfArea(turfBoundingBox);
    if (intArea === hashArea) {
      return TileIntersectionType.FULL;
    }
    return TileIntersectionType.PARTIAL;
  }
}
function polygonToTiles(
  polygon: Polygon,
  zoom: Zoom,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): TileRange[] {
  const boundingBox = geometryToBoundingBox(polygon);
  const minimalZoom = findMinimalZoom(boundingBox, referenceTileGrid);
  const tileRange = boundingBoxToTileRange(
    boundingBox,
    minimalZoom,
    1,
    referenceTileGrid
  );
  return polygonToTileRanges(polygon, tileRange, zoom, referenceTileGrid);
}

function polygonToTileRanges(
  polygon: Polygon,
  tileRange: TileRange,
  zoom: Zoom,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): TileRange[] {
  const tileRanges: TileRange[] = [];
  const partialTiles: Tile[] = [];
  for (const tile of tileRange.tileGenerator()) {
    const tileIntersectionType = polygonTileIntersection(polygon, tile);
    if (tileIntersectionType === TileIntersectionType.FULL) {
      tileRanges.push(tileToTileRange(tile, zoom));
    } else if (tileIntersectionType === TileIntersectionType.PARTIAL) {
      if (tile.z === zoom) {
        tileRanges.push(tileToTileRange(tile, zoom));
      } else {
        partialTiles.push(tile);
      }
    }
  }

  for (const tile of partialTiles) {
    tileRanges.push(
      ...polygonToTileRanges(
        polygon,
        tileToTileRange(tile, tile.z + 1),
        zoom,
        referenceTileGrid
      )
    );
  }
  return tileRanges;
}
