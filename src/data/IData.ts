import { SourceId } from "../type-alias";

export default interface IData {
  id: SourceId;
  columns: Array<string>;
  rows: Array<any>;
  updateColumnList(): void;
}
