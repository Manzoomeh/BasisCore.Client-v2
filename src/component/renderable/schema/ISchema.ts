import IDictionary from "../../../../IDictionary";

export type WebMethod = "POST" | "GET";

export type ViewType =
  | "Text"
  | "Textarea"
  | "Autocomplete"
  | "Select"
  | "Upload"
  | "Datepicker"
  | "Checklist";

export interface ISchema {
  schemaId: string;
  schemaVersion: string;
  lid: number;
}

export default interface IQuestionSchema extends ISchema {
  baseVocab: string;
  questions: Array<IQuestion>;
  sections: Array<ISection>;
}

export interface IQuestion {
  prpId: number;
  typeId: number;
  ord: number;
  vocab: string;
  title: string;
  wordId: number;
  multi: boolean;
  sectionId: number;
  cssClass: string;
  help?: string;
  parts: Array<IQuestionPart>;
}

export interface IQuestionPart {
  part: number;
  viewType: string | ViewType;
  cssClass: string;
  validations: IDictionary<any>;
  caption?: string;
  link?: string;
  fixValues?: Array<IFixValue>;
  dependency?: Array<IDependency>;
  method?: WebMethod;
}

export interface IFixValue {
  id: number;
  value: string;
}

export interface IDependency {
  id: number;
  part: number;
  schemaId: number;
  prpId: number;
}

export interface ISection {
  id: number;
  title: string;
  description: string;
}

export interface IAnswerSchema extends ISchema {
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
