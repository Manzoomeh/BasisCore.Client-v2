import { FaceRowType } from "../../../enum";
import ITemplate from "./template/ITemplate";

export default class Face {
  Name: string;
  ApplyReplace: boolean;
  ApplyFunction: boolean;
  RowType: FaceRowType;
  RelatedRows: Array<any[]>;
  template: ITemplate;
  Levels: string[];
}
