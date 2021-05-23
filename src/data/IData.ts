import { SourceId } from "../type-alias";

export default interface IData {
  Id: SourceId;
  Columns: Array<string>;
  Rows: Array<any>;
  updateColumnList();
}
