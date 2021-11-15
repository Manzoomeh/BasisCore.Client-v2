export default interface IFormMakerOptions {
  viewMode: boolean;
  url: string;
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
