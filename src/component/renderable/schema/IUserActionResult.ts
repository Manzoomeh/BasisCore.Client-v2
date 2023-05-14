import ISchema from "./ISchema";

export default interface IUserActionResult extends ISchema {
  usedForId?: number;
  ownerid?: number;
  properties: Array<IUserActionProperty>;
}

export interface IUserActionProperty {
  propId: number;
  multi: boolean;
  added?: Array<IUserActionAnswer>;
  edited?: Array<IUserActionAnswer>;
  deleted?: Array<IUserActionAnswer>;
}

export interface IAnswerValues {
  propId: number;
  multi: boolean;
  values?: Array<IUserActionAnswer>;
}

export interface IUserActionAnswer {
  id?: number;
  parts?: Array<IUserActionPart>;
}

export interface IUserActionPart {
  part: number;
  values: Array<IUserActionPartValue>;
}

export interface IUserActionPartValue {
  id?: number;
  value?: any;
  answer?: IUserActionResult;
}
