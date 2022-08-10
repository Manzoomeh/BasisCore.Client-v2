import ISchema from "./ISchema";

export default interface IQuestionSchema extends ISchema {
  name: string;
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
  disabled?: boolean;
  useInList?: boolean;
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
  disabled?: boolean;
  options?: any;
  multiple?: boolean;
}

export type WebMethod = "POST" | "GET";

export type ViewType =
  | "Text"
  | "Textarea"
  | "Autocomplete"
  | "Select"
  | "Upload"
  | "Datepicker"
  | "Checklist"
  | "Radio"
  | "Lookup"
  | "Time"
  | "Color";

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
  size?: number;
}

export interface IFixValue {
  id: number;
  value: string;
  selected?: boolean;
  schema?: ISchema;
}

export interface IDependency {
  id: number;
  part: number;
  schemaId: number;
  prpId: number;
}
