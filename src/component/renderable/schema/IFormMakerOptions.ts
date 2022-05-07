import { DependencyContainer } from "tsyringe";
import IContext from "../../../context/IContext";
import IQuestionSchema from "./IQuestionSchema";

export default interface IFormMakerOptions {
  viewMode: boolean;
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
  id: string,
  ver: string,
  lid: number
) => Promise<IQuestionSchema>;

export type SubSchemaOptions = {
  schemaUrl: string;
  viewMode: string;
  callback: string;
  schemaCallback: string;
  cell: string;
};
