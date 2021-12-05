import ISchema from "./ISchema";

export interface IUserActionResult extends ISchema {
  usedForId?: number;
  properties: Array<IUserActionProperty>;
}

export interface IUserActionProperty {
  propId: number;
  added?: Array<IUserActionAnswer>;
  edited?: Array<IUserActionAnswer>;
  deleted?: Array<IUserActionAnswer>;
}

export interface IUserActionAnswer {
  id?: number;
  parts?: Array<IUserActionPart>;
}

export interface IUserActionPart {
  part: number;
  values: Array<IUserActionPartValue>;
}

export interface IValidationError {
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

export interface IUserActionPartValue {
  id?: number;
  value?: any;
}
