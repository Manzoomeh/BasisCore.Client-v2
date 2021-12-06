export default interface IValidationError {
  part: number;
  title: string;
  errors: Array<IValidationErrorPart>;
}

export type ValidationErrorType =
  | "required"
  | "regex"
  | "range"
  | "type"
  | "length";

export interface IValidationErrorPart {
  type: ValidationErrorType;
  params?: Array<any>;
}
