import {
  ValidationIssue,
  ValidationIssueType,
  ValidationResult,
} from './validation_classes';
import {check, HintError, HintIssue} from '@placemarkio/check-geojson';
import {kinks} from '@turf/turf';
import {TileGrid} from '../tiles/tiles_classes';
import {TILEGRID_WORLD_CRS84} from '../tiles/tiles_constants';
import {validateLonlat} from './validations';
import {LonLat} from '../classes';
import {Geometry} from 'geojson';

/**
 * Validates that the input `geojson` is valid based on the RFC 7946 GeoJSON specification
 * @param geojson the geojson to validate
 */
export function validateGeoJson(geojson: string): ValidationResult {
  try {
    check(geojson);
    return new ValidationResult(true);
  } catch (error) {
    if (error instanceof HintError) {
      const issues = error.issues.map(convertHintIssueToValidationIssue);
      return new ValidationResult(false, issues);
    } else {
      throw error;
    }
  }
}

/**
 * Validates that the input `geojson` does not self intersect
 * @param geojson
 */
export function validateGeoJsonSelfIntersect(
  geojson: string
): ValidationResult {
  if (kinks(JSON.parse(geojson)).features.length > 0) {
    return new ValidationResult(false, [
      new ValidationIssue(
        'The polygon is self intersecting',
        ValidationIssueType.GeoJsonSelfIntersect
      ),
    ]);
  } else {
    return new ValidationResult(true);
  }
}
const geometryTypes = [
  'Point',
  'MultiPoint',
  'Polygon',
  'MultiPolygon',
  'LineString',
  'MultiLineString',
  'GeometryCollection',
];

/**
 * Validates that the input `geojson` is on of the `types`
 * @param geojson
 * @param types
 */
export function validateGeoJsonTypes(
  geojson: string,
  types: string[]
): ValidationResult {
  if (types.length === 0 || types.some(type => !geometryTypes.includes(type))) {
    throw new Error('types must be a non empty array of valid geojson types');
  }

  const geoJsonObject = JSON.parse(geojson);
  if (geoJsonObject.type === 'FeatureCollection') {
    for (const feature of geoJsonObject.features) {
      const validationResult = innerValidateGeoJsonTypes(
        feature.geometry,
        types
      );
      if (!validationResult.isValid) {
        return validationResult;
      }
    }
  } else {
    return innerValidateGeoJsonTypes(geoJsonObject, types);
  }
  return new ValidationResult(true);
}

/**
 * Validates that the input `geojson` is inside the `tileGrid`
 * @param geojson
 * @param tileGrid
 */
export function validateGeoJsonInGrid(
  geojson: string,
  tileGrid: TileGrid = TILEGRID_WORLD_CRS84
): ValidationResult {
  const geoJsonObject = JSON.parse(geojson);

  if (geoJsonObject.type === 'FeatureCollection') {
    for (const feature of geoJsonObject.features) {
      const validationResult = innerValidateGeoJsonInGrid(
        feature.geometry,
        tileGrid
      );
      if (!validationResult.isValid) {
        return validationResult;
      }
    }
  } else {
    return innerValidateGeoJsonInGrid(geoJsonObject, tileGrid);
  }
  return new ValidationResult(true);
}

function innerValidateGeoJsonInGrid(
  geoJsonObject: Geometry,
  tileGrid: TileGrid
) {
  if (geoJsonObject.type === 'Point') {
    const x = geoJsonObject.coordinates[0];
    const y = geoJsonObject.coordinates[1];
    const validationResult = isPointInGrid(x, y, tileGrid);
    if (!validationResult.isValid) {
      return validationResult;
    }
  }
  if (geoJsonObject.type === 'Polygon') {
    const coordinates = geoJsonObject.coordinates[0];
    for (const coordinate of coordinates) {
      const x = coordinate[0];
      const y = coordinate[1];
      const validationResult = isPointInGrid(x, y, tileGrid);
      if (!validationResult.isValid) {
        return validationResult;
      }
    }
  } else if (geoJsonObject.type === 'MultiPolygon') {
    const polygons = geoJsonObject.coordinates;
    for (const polygon of polygons) {
      for (const coordinate of polygon[0]) {
        const x = coordinate[0];
        const y = coordinate[1];
        const validationResult = isPointInGrid(x, y, tileGrid);
        if (!validationResult.isValid) {
          return validationResult;
        }
      }
    }
  }
  return new ValidationResult(true);
}

function isPointInGrid(x: number, y: number, tileGrid: TileGrid) {
  try {
    validateLonlat(new LonLat(x, y), tileGrid);
  } catch (error) {
    return new ValidationResult(false, [
      new ValidationIssue(
        `Point lon: ${x} lat: ${y} is not inside the grid`,
        ValidationIssueType.GeoJsonNotInGrid
      ),
    ]);
  }

  return new ValidationResult(true);
}

function innerValidateGeoJsonTypes(
  geojson: Geometry,
  types: string[]
): ValidationResult {
  if (!types.includes(geojson.type)) {
    return new ValidationResult(false, [
      new ValidationIssue(
        `Type ${geojson.type} was not specified in the allowed types`,
        ValidationIssueType.GeoJsonInvalidType
      ),
    ]);
  } else {
    return new ValidationResult(true);
  }
}

function convertHintIssueToValidationIssue(
  hintIssue: HintIssue
): ValidationIssue {
  return new ValidationIssue(
    hintIssue.message,
    convertHintIssueMessageToValidationIssueType(hintIssue.message),
    hintIssue.from,
    hintIssue.to
  );
}

function convertHintIssueMessageToValidationIssueType(
  hintIssueMessage: string
): ValidationIssueType {
  switch (hintIssueMessage) {
    case 'Expected to find four or more positions here.':
      return ValidationIssueType.GeoJsonNotEnoughCoordinates;
    case 'The polygon is self intersecting':
      return ValidationIssueType.GeoJsonSelfIntersect;
    case 'First and last positions of a Polygon or MultiPolygon’s ring should be the same.':
      return ValidationIssueType.GeoJsonNotClosed;
    default:
      return ValidationIssueType.GeoJsonInvalid;
  }
}

/**
 * Validates that the input `geojson` has less than or equal `numberOfVertices`
 * @param geojson
 * @param numberOfVertices
 */
export function validateNumberOfVertices(
  geojson: string,
  numberOfVertices: number
) {
  const geoJsonObject = JSON.parse(geojson);
  if (geoJsonObject.type === 'FeatureCollection') {
    for (const feature of geoJsonObject.features) {
      const validationResult = innerValidateNumberOfVertices(
        feature.geometry,
        numberOfVertices
      );
      if (!validationResult.isValid) {
        return validationResult;
      }
    }
  } else {
    return innerValidateNumberOfVertices(geoJsonObject, numberOfVertices);
  }
  return new ValidationResult(true);
}

function innerValidateNumberOfVertices(
  geometry: Geometry,
  numberOfVertices: number
): ValidationResult {
  if (geometry.type === 'Polygon') {
    const coordinates = geometry.coordinates[0];
    if (coordinates.length > numberOfVertices) {
      return new ValidationResult(false, [
        new ValidationIssue(
          `Polygon has more than ${numberOfVertices} vertices`,
          ValidationIssueType.GeoJsonTooManyCoordinates
        ),
      ]);
    }
  } else if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates;
    for (const polygon of polygons) {
      if (polygon[0].length > numberOfVertices) {
        return new ValidationResult(false, [
          new ValidationIssue(
            `Polygon has more than ${numberOfVertices} vertices`,
            ValidationIssueType.GeoJsonTooManyCoordinates
          ),
        ]);
      }
    }
  }
  return new ValidationResult(true);
}
