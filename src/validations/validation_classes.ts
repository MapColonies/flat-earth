export class ValidationResult {
  isValid: boolean;
  issues?: ValidationIssue[];

  constructor(isValid: boolean, issues?: ValidationIssue[]) {
    this.isValid = isValid;
    this.issues = issues;
  }
}

export class ValidationIssue {
  constructor(
    public message: string,
    public validationIssueType: ValidationIssueType,
    public from: number = 0,
    public to: number = 0
  ) {}
}

export enum ValidationSeverity {
  Error,
  Warning,
  Info,
}

export enum ValidationIssueType {
  GeoJsonInvalid,
  GeoJsonNotEnoughCoordinates,
  GeoJsonSelfIntersect,
  GeoJsonNotClosed,
  GeoJsonInvalidType,
  GeoJsonNotInGrid,
  GeoJsonTooManyCoordinates,
}
