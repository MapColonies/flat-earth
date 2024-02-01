export class ValidationResult {
  public constructor(
    public isValid: boolean,
    public issues?: ValidationIssue[]
  ) {}
}

export class ValidationIssue {
  public constructor(
    public message: string,
    public validationIssueType: ValidationIssueType,
    public from: number = 0,
    public to: number = 0
  ) {}
}

export enum ValidationSeverity {
  ERROR,
  WARNING,
  INFO,
}

export enum ValidationIssueType {
  GEOJSON_INVALID,
  GEOJSON_NOT_ENOUGH_COORDINATES,
  GEOJSON_SELF_INTERSECT,
  GEOJSON_NOT_CLOSED,
  GEOJSON_INVALID_TYPE,
  GEOJSON_NOT_IN_GRID,
  GEOJSON_TOO_MANY_COORDINATES,
}
