export class ValidationResult {
  isValid: boolean;
  issues?: ValidationIssue[];

  constructor(isValid: boolean, issues?: ValidationIssue[]) {
    this.isValid = isValid;
    this.issues = issues;
  }
}

export class ValidationIssue {
  message: string;
  severity: ValidationSeverity;
  from: number;
  to: number;

  constructor(
    message: string,
    severity: ValidationSeverity,
    from: number,
    to: number
  ) {
    this.message = message;
    this.severity = severity;
    this.from = from;
    this.to = to;
  }
}

export enum ValidationSeverity {
  Error,
  Warning,
  Info,
}
