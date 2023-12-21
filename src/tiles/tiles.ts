import {SCALE_FACTOR, TILEGRID_WORLD_CRS84} from './tiles_constants';
import {BoundingBox, LonLat} from '../classes';
import {Tile, TileGrid} from './tiles_classes';
import {Zoom} from '../types';
import {
  validateLonlat,
  validateMetatile,
  validateTile,
  validateTileGrid,
  validateTileGridBoundingBox,
  validateZoomLevel,
} from './validations';

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

function tileProjectedHeight(zoom: Zoom, referenceTileGrid: TileGrid): number {
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

function* tilesGenerator(
  limits: BoundingBox,
  zoom: Zoom,
  metatile: number
): Generator<Tile, undefined, undefined> {
  for (let y = limits.min.lat; y <= limits.max.lat; y++) {
    for (let x = limits.min.lon; x <= limits.max.lon; x++) {
      yield {x, y, z: zoom, metatile};
    }
  }

  return;
}

function geoCoordsToTile(
  lonlat: LonLat,
  zoom: Zoom,
  metatile = 1,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): Tile {
  const width = tileProjectedWidth(zoom, referenceTileGrid) * metatile;
  const height = tileProjectedHeight(zoom, referenceTileGrid) * metatile;

  const x = Math.floor(
    (lonlat.lon - referenceTileGrid.boundingBox.min.lon) / width
  );
  const y = Math.floor(
    (referenceTileGrid.boundingBox.max.lat - lonlat.lat) / height
  );

  // clamp the values in cases when lon is 180 which is calculated as beyond
  // the range of tile index for a given zoom level
  return {
    x: clampValues(
      x,
      0,
      Math.ceil(
        (referenceTileGrid.numberOfMinLevelTilesX / metatile) *
          SCALE_FACTOR ** zoom -
          1
      )
    ),
    y: clampValues(
      y,
      0,
      Math.ceil(
        (referenceTileGrid.numberOfMinLevelTilesY / metatile) *
          SCALE_FACTOR ** zoom -
          1
      )
    ),
    z: zoom,
    metatile: metatile,
  };
}

/**
 * Creates a generator function which calculates a tile within a bounding box
 * @param bbox the bounding box
 * @param zoom the zoom level
 * @param metatile the size of a metatile
 * @param referenceTileGrid a tile grid which the calculated tile belongs to
 * @returns generator function which calculates tiles within the `bbox`
 */
export function boundingBoxToTiles(
  bbox: BoundingBox,
  zoom: Zoom,
  metatile = 1,
  referenceTileGrid: TileGrid = TILEGRID_WORLD_CRS84
): Generator<Tile, undefined, undefined> {
  validateMetatile(metatile);
  validateTileGrid(referenceTileGrid);
  validateTileGridBoundingBox(bbox, referenceTileGrid);
  validateZoomLevel(zoom, referenceTileGrid);

  const upperLeftTile = geoCoordsToTile(
    new LonLat(bbox.min.lon, bbox.max.lat),
    zoom,
    metatile,
    referenceTileGrid
  );
  const lowerRightTile = geoCoordsToTile(
    new LonLat(bbox.max.lon, bbox.min.lat),
    zoom,
    metatile,
    referenceTileGrid
  );

  return tilesGenerator(
    new BoundingBox(
      upperLeftTile.x,
      lowerRightTile.y,
      lowerRightTile.x,
      upperLeftTile.y
    ),
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

  return geoCoordsToTile(lonlat, zoom, metatile, referenceTileGrid);
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
