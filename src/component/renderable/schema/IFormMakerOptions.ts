import IContext from "../../../context/IContext";
import IQuestionSchema from "./IQuestionSchema";

export default interface IFormMakerOptions {
  viewMode: boolean;
  schemaId?: string;
  version?: string;
  lid?: number;
  callback: (params: IEditParams) => void;
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
