import { FaceRowType } from "../enum";

export default class Face {
  Name: string;
  ApplyReplace: boolean;
  ApplyFunction: boolean;
  RowType: FaceRowType;
  RelatedRows: Array<any[]>;
  FormattedTemplate: string;
  Levels: string[];
}
