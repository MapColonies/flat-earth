import { ValidationIssue, ValidationResult, ValidationSeverity } from "./validation_classes";
import { check, HintError, HintIssue } from "@placemarkio/check-geojson";

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
    hintIssue.to
  );
}
