import { FaceRowType } from "../../../enum";
import ITemplate from "./template/ITemplate";

export default class Face {
  Name: string;
  RowType: FaceRowType;
  RelatedRows: Array<any[]>;
  template: ITemplate<string>;
  Levels: string[];
}
