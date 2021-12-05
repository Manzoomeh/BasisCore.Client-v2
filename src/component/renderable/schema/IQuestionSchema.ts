import ISchema from "./ISchema";

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
  validations: IValidationOptions;
  caption?: string;
  link?: string;
  fixValues?: Array<IFixValue>;
  dependency?: Array<IDependency>;
  method?: WebMethod;
}

export type WebMethod = "POST" | "GET";

export type ViewType =
  | "Text"
  | "Textarea"
  | "Autocomplete"
  | "Select"
  | "Upload"
  | "Datepicker"
  | "Checklist";

export interface ISection {
  id: number;
  title: string;
  description: string;
}

export type AnswerDataType = "float" | "int";

export interface IValidationOptions {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  dataType?: AnswerDataType;
  required?: boolean;
  regex?: string;
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
