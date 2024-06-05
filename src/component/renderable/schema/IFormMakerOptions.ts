import { DependencyContainer } from "tsyringe";
import IContext from "../../../context/IContext";
import IDictionary from "../../../IDictionary";
import IQuestionSchema from "./IQuestionSchema";

export default interface IFormMakerOptions {
  displayMode: DisplayMode;
  paramUrl?: string;
  schemaId?: string;
  version?: string;
  lid?: number;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  callback: (params: IEditParams) => void;
  subSchemaOptions: SubSchemaOptions;
  dc: DependencyContainer;
  getQueryStringParamsAsync: () => Promise<IDictionary<string>>;
  filesPath?: string;
}

export interface IEditParams {
  element: Element;
  prpId: number;
  typeId: number;
  value: any;
}

export type GetSchemaCallbackAsync = (
  context: IContext,
  schemaUrl: string
) => Promise<IQuestionSchema>;

export type SubSchemaOptions = {
  schemaUrl: string;
  displayMode: DisplayMode;
  callback: string;
  schemaCallback: string;
  cell: string;
};

export type DisplayMode = "edit" | "new" | "view";
