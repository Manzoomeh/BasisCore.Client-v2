import ISchema from "./ISchema";

export default interface IAnswerSchema extends ISchema {
  usedForId: number;
  lastUpdate: string;
  properties: Array<IAnswerProperty>;
}

export interface IAnswerProperty {
  prpId: number;
  answers: Array<IAnswerPart>;
}

export interface IAnswerPart {
  id?: number;
  parts: Array<IPartCollection>;
}
export interface IPartCollection {
  part: number;
  values: Array<IPartValue>;
}
export interface IPartValue {
  id?: number;
  value: any;
}
