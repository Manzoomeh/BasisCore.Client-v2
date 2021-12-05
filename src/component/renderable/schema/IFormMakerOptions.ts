import IQuestionSchema from "./IQuestionSchema";

export default interface IFormMakerOptions {
  viewMode: boolean;
  getSchemaCallbackAsync: GetSchemaCallbackAsync;
  schemaId: string;
  version: string;
  callback: (params: IEditParams) => void;
}

export interface IEditParams {
  element: Element;
  prpId: number;
  typeId: number;
  value: any;
}

export type GetSchemaCallbackAsync = (
  id: string,
  ver: string
) => Promise<IQuestionSchema>;
