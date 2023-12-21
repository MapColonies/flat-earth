/* eslint-disable @typescript-eslint/no-magic-numbers */
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { bbox, Feature, FeatureCollection, MultiPolygon, Polygon } from '@turf/turf';
import { ITile, ITileRange } from '../models/interfaces/geo/iTile';
import { bboxToTileRange, snapBBoxToTileGrid } from './bboxUtils';
import { tileToDegrees } from './geoConvertor';

const zoomToResolutionDegMapper: Record<number, number> = {
  /* eslint-disable @typescript-eslint/naming-convention */
  0: 0.703125,
  1: 0.3515625,
  2: 0.17578125,
  3: 0.087890625,
  4: 0.0439453125,
  5: 0.02197265625,
  6: 0.010986328125,
  7: 0.0054931640625,
  8: 0.00274658203125,
  9: 0.001373291015625,
  10: 0.0006866455078125,
  11: 0.00034332275390625,
  12: 0.000171661376953125,
  13: 0.0000858306884765625,
  14: 0.0000429153442382812,
  15: 0.0000214576721191406,
  16: 0.0000107288360595703,
  17: 0.00000536441802978516,
  18: 0.00000268220901489258,
  19: 0.00000134110450744629,
  20: 0.000000670552253723145,
  21: 0.000000335276126861572,
  22: 0.000000167638063430786,
  /* eslint-enable @typescript-eslint/naming-convention */
};

const zoomToResolutionMeterMapper: Record<number, number> = {
  /* eslint-disable @typescript-eslint/naming-convention */
  0: 78271.52,
  1: 39135.76,
  2: 19567.88,
  3: 9783.94,
  4: 4891.97,
  5: 2445.98,
  6: 1222.99,
  7: 611.5,
  8: 305.75,
  9: 152.87,
  10: 76.44,
  11: 38.22,
  12: 19.11,
  13: 9.55,
  14: 4.78,
  15: 2.39,
  16: 1.19,
  17: 0.6,
  18: 0.3,
  19: 0.15,
  20: 0.075,
  21: 0.037,
  22: 0.0185,
  /* eslint-enable @typescript-eslint/naming-convention */
};

/**
 * calculates tile size (resolution) in degrees
 * @param zoomLevel zoom level of returned tile size
 * @returns tile size (resolution) in degrees
 */
export function degreesPerTile(zoomLevel: number): number {
  const latRange = 180;
  return latRange / (1 << zoomLevel);
}

/**
 * returns pixel size (resolution) in degrees
 * @param zoomLevel tile zoom level of returned tile pixel size
 * @returns pixel size (resolution) in degrees
 */
export function degreesPerPixel(zoomLevel: number): number {
  const tileSize = 256;
  const tileRes = degreesPerTile(zoomLevel);
  return tileRes / tileSize;
}

/**
 * coverts tile coordinates between ll and ul
 * @param tile source tile
 * @returns converted tile
 */
export function flipYAxis(tile: ITile): ITile {
  const yTiles = 1 << tile.zoom;
  return {
    x: tile.x,
    y: yTiles - tile.y - 1,
    zoom: tile.zoom,
  };
}

/**
 * converts zoom level (integer) to matching resolution degree value
 * @param zoom zoom level in range of 0-22
 * @returns resolution represented in degrees, or undefined if zoom level is out of range
 */
export function zoomLevelToResolutionDeg(zoom: number): number | undefined {
  return zoomToResolutionDegMapper[zoom];
}

/**
 * converts zoom level (integer) to matching resolution meter value
 * @param zoom zoom level in range of 0-22
 * @returns resolution represented in Meters, or undefined if zoom level is out of range
 */
export function zoomLevelToResolutionMeter(zoom: number): number | undefined {
  return zoomToResolutionMeterMapper[zoom];
}

/**
 * converts pixel size (resolution) in degrees to matching zoom level (rounded down)
 * @param resolution pixel size (resolution) in degrees
 * @returns zoom level for given pixel size
 */
export function degreesPerPixelToZoomLevel(resolution: number): number {
  const MIN_ZOOM_LEVEL = 0;
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const zoomLevel = Math.floor(Math.log2(180 / (resolution * 256)));
  if (zoomLevel < MIN_ZOOM_LEVEL) {
    throw new Error(`Invalid zoom level ${zoomLevel} for resolution ${resolution}`);
  }
  return zoomLevel;
}

/**
 * returns bbox of given tile
 * @param tile
 * @returns
 */
export function tileToBbox(tile: ITile): BBox2d {
  const minPoint = tileToDegrees(tile);
  const tileSize = degreesPerTile(tile.zoom);
  return [minPoint.longitude, minPoint.latitude, minPoint.longitude + tileSize, minPoint.latitude + tileSize];
}

/**
 * returns the batch area
 * @param ITileRange
 * @returns
 */
export function tileRangeToTilesCount(batch: ITileRange): number {
  return (batch.maxX - batch.minX) * (batch.maxY - batch.minY);
}

/**
 * returns tiles amount of given feature and zoom ranges - based on 2:1 tile scheme
 * use the bboxToTileRange method and provide sanitized bbox coverage of tiles
 * @param feature
 * If feature's properties include attributes of "maxResolutionDeg" and "minResolutionDeg" or just one of them -
 * It will be converted to maxZoom and minZoom instead of default params to calculate
 * minResolutionDeg >= 0.703125
 * maxResolutionDeg <= 0.000000167638063430786
 * @param layerFootprint - referenced layer geometry to snap on the bbox
 * @param defaultMaxZoom optional - default is 22 - if maxResolutionDeg property was provided, the param will be ignored
 * @param defaultMinZoom optional - default is 0 - if minResolutionDeg property was provided, the param will be ignored
 * @returns tile count included on provided feature and zooms ranges
 */
export function featureToTilesCount(feature: Feature<Polygon | MultiPolygon>, defaultMaxZoom = 22, defaultMinZoom = 0): number {
  let tilesTotalAmount = 0;

  if (defaultMaxZoom > 22 || defaultMinZoom < 0) {
    throw new RangeError(`Un supported zoom levels values, min-max zoom should be [0-22] but actual [${defaultMinZoom}:${defaultMaxZoom}]`);
  }

  if (defaultMinZoom > defaultMaxZoom) {
    throw new RangeError(`Illegal - defaultMinZoom[${defaultMinZoom}] is larger than defaultMaxZoom[${defaultMaxZoom}]`);
  }
  try {
    const targetMaxZoom =
      feature.properties?.maxResolutionDeg !== undefined && typeof feature.properties.maxResolutionDeg === 'number'
        ? degreesPerPixelToZoomLevel(feature.properties.maxResolutionDeg)
        : defaultMaxZoom;
    const targetMinZoom =
      feature.properties?.minResolutionDeg !== undefined && typeof feature.properties.minResolutionDeg === 'number'
        ? degreesPerPixelToZoomLevel(feature.properties.minResolutionDeg)
        : defaultMinZoom;
    const sanitized = snapBBoxToTileGrid(bbox(feature.geometry) as BBox2d, targetMaxZoom);

    for (let i = targetMinZoom; i <= targetMaxZoom; i++) {
      const zoomTilesBatch = bboxToTileRange(sanitized, i);
      tilesTotalAmount += tileRangeToTilesCount(zoomTilesBatch);
    }

    return tilesTotalAmount;
  } catch (error) {
    const message = `Error occurred while trying to calculate tiles amount - encodeFootprint error: ${JSON.stringify(error)}`;
    throw new Error(message);
  }
}

/**
 * returns tiles amount of given featureCollection [each feature may include maxResolutionDeg and minResolutionDeg
 * if no resolutions in property will calculate all features with optional argument]
 * based on 2:1 tile scheme
 * use the bboxToTileRange method and provide sanitized bbox coverage of tiles
 * @param fc - FeatureCollection
 * foreach feature in featuresCollection features array:
 * If feature's properties include attributes of "maxResolutionDeg" and "minResolutionDeg" or just one of them -
 * It will be converted to maxZoom and minZoom instead of default params to calculate
 * minResolutionDeg >= 0.703125
 * maxResolutionDeg <= 0.000000167638063430786
 * for current feature in the array
 * @param defaultMaxZoom optional - default is 22 - if maxResolutionDeg property was provided, the param will be ignored
 * @param defaultMinZoom optional - default is 0 - if minResolutionDeg property was provided, the param will be ignored
 * @returns tile count included on provided feature and zooms ranges
 */
export function featureCollectionToTilesCount(fc: FeatureCollection, defaultMaxZoom = 22, defaultMinZoom = 0): number {
  let tilesTotalAmount = 0;
  try {
    for (const feature of fc.features) {
      tilesTotalAmount += featureToTilesCount(feature as Feature<Polygon | MultiPolygon>, defaultMaxZoom, defaultMinZoom);
    }
    return tilesTotalAmount;
  } catch (error) {
    const message = `Error occurred while trying to calculate tiles amount - encodeFootprint error: ${JSON.stringify(error)}`;
    throw new Error(message);
  }
}
