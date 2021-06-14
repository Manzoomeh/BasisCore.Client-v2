import { SourceId } from "../type-alias";
import IData from "./IData";

export default class Data implements IData {
  protected _rows: Array<any>;
  //protected _columns: Array<string>;
  private _id: SourceId;
  public get id(): SourceId {
    return this._id;
  }
  public set id(value: SourceId) {
    this._id = value.toLowerCase();
  }
  // public get columns(): Array<string> {
  //   return this._columns;
  // }
  public get rows(): Array<any> {
    return this._rows;
  }
  // public set rows(value: Array<any>) {
  //   this._rows = value;
  //   this.updateColumnList();
  // }
  constructor(sourceId: SourceId, rows: Array<any> = []) {
    this.id = sourceId;
    this._rows = rows;
  }

  // public updateColumnList(): void {
  //   try {
  //     this._columns = Object.getOwnPropertyNames(this._rows[0]);
  //   } catch {
  //     this._columns = [];
  //   }
  // }
}
