import IData from "./IData";

export default class Data implements IData {
  protected _rows: Array<any>;
  Name: string;
  Columns: Array<string>;
  get Rows(): Array<any> {
    return this._rows;
  }
  set Rows(value: Array<any>) {
    this._rows = value;
    this.UpdateColumnList();
  }
  constructor(name: string, rows: Array<any> = []) {
    this.Name = name.toLowerCase();
    this.Rows = rows;
  }

  public UpdateColumnList() {
    try {
      this.Columns = Object.getOwnPropertyNames(this._rows[0]);
    } catch {
      this.Columns = [];
    }
  }
}
