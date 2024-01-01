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
    public severity: ValidationSeverity,
    public from: number,
    public to: number,
    public validationIssueType: ValidationIssueType
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
}
