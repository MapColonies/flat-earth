import {
  ValidationIssue,
  ValidationIssueType,
  ValidationResult,
  ValidationSeverity,
} from './validation_classes';
import {check, HintError, HintIssue} from '@placemarkio/check-geojson';
import {kinks} from '@turf/turf';
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
        ValidationSeverity.Warning,
        0,
        0,
        ValidationIssueType.GeoJsonSelfIntersect
      ),
    ]);
  } else {
    return new ValidationResult(true);
  }
}

/**
 * Validates that the input `geojson` is on of the `types`
 * @param geojson
 * @param types
 */
export function validateGeoJsonTypes(
  geojson: string,
  types: string[]
): ValidationResult {
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

function innerValidateGeoJsonTypes(
  geojson: Geometry,
  types: string[]
): ValidationResult {
  if (!types.includes(geojson.type)) {
    return new ValidationResult(false, [
      new ValidationIssue(
        `Type ${geojson.type} was not specified in the allowed types`,
        ValidationSeverity.Warning,
        0,
        0,
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
  const severity =
    hintIssue.severity === 'error'
      ? ValidationSeverity.Error
      : ValidationSeverity.Warning;
  return new ValidationIssue(
    hintIssue.message,
    severity,
    hintIssue.from,
    hintIssue.to,
    convertHintIssueMessageToValidationIssueType(hintIssue.message)
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
