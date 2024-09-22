import { HtmlDirection } from "./IFormMakerOptions";

export default interface ISchema {
  paramUrl: string;
  schemaId: string;
  schemaVersion: string;
  lid: number;
  direction?: HtmlDirection;
}
