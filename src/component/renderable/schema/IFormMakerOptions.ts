import { DependencyContainer } from "tsyringe";
import IContext from "../../../context/IContext";
import IQuestionSchema from "./IQuestionSchema";

export default interface IFormMakerOptions {
  displayMode: DisplayMode;
  schemaUrl?: string;
  schemaId?: string;
  version?: string;
  lid?: number;
  callback: (params: IEditParams) => void;
  subSchemaOptions: SubSchemaOptions;
  dc: DependencyContainer;
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
