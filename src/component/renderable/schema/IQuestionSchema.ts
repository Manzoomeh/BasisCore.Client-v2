import ISchema from "./ISchema";

export default interface IQuestionSchema extends ISchema {
  schemaName: string;
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
  uploadToken?: string;
  fixValues?: Array<IFixValue>;
  dependency?: Array<IDependency>;
  method?: WebMethod;
  disabled?: boolean;
  readonly?: boolean;
  options?: any;
  multiple?: boolean;
}

export type WebMethod = "POST" | "GET";

export type ViewType =
  | "Text"
  | "Textarea"
  | "Autocomplete"
  | "Reference"
  | "Select"
  | "Upload"
  | "Datepicker"
  | "Checklist"
  | "Radio"
  | "Lookup"
  | "Time"
  | "Color"
  | "Blob";

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
  mimes?: Array<IMimes>;
  size?: number;
}

export interface IFixValue {
  id: number;
  value: string;
  selected?: boolean;
  schema?: ISchema;
}

export interface IDependency {
  prpId: number;
  part: number;
  name: string;
  required: boolean;
}
export interface IMimes {
  mime: string;
  minSize: number;
  maxSize: number;
}
