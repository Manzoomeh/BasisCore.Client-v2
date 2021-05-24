import { SourceId } from "../type-alias";
import IData from "./IData";

export default class Data implements IData {
  protected _rows: Array<any>;
  Id: SourceId;
  Columns: Array<string>;
  get Rows(): Array<any> {
    return this._rows;
  }
  set Rows(value: Array<any>) {
    this._rows = value;
    this.updateColumnList();
  }
  constructor(sourceId: SourceId, rows: Array<any> = []) {
    this.Id = sourceId.toLowerCase();
    this.Rows = rows;
  }

  public updateColumnList() {
    try {
      this.Columns = Object.getOwnPropertyNames(this._rows[0]);
    } catch {
      this.Columns = [];
    }
  }
}
