import ISourceOptions from "../context/ISourceOptions";
import { MergeType } from "../enum";
import { SourceId } from "../type-alias";
import ISource from "./ISource";

export default class Source implements ISource {
  keyFieldName?: string;
  statusFieldName?: string;
  public mergeType: MergeType;
  protected _rows: Array<any>;
  protected _versions: Array<number>;
  private _id: SourceId;
  public extra?: any;

  public get id(): SourceId {
    return this._id;
  }

  public get rows(): Array<any> {
    return this._rows;
  }

  public get versions(): Array<any> {
    return this._versions;
  }

  constructor(id: SourceId, data: any, options?: ISourceOptions) {
    this._id = id.toLowerCase();
    this.mergeType = options?.mergeType ?? MergeType.replace;
    this.keyFieldName = options?.keyFieldName;
    this.statusFieldName = options?.statusFieldName;
    this.extra = options?.extra;
    if (Array.isArray(data)) {
      this._rows = data;
    } else if (typeof data === "object") {
      this._rows = [data];
    } else {
      this._rows = [{ value: data }];
    }
    this._versions = Array(this._rows.length).fill(0);
  }

  public cloneOptions(): ISourceOptions {
    return {
      keyFieldName: this.keyFieldName,
      mergeType: this.mergeType,
      statusFieldName: this.statusFieldName,
      extra: this.extra,
    };
  }

  public removeRowFormIndex(index: number) {
    this._rows.splice(index, 1);
    this._versions.splice(index, 1);
  }

  public replaceRowFromIndex(index: number, newRow: any): void {
    this._rows.splice(index, 1, newRow);
    this._versions[index] += 1;
  }

  public addRow(row: any): void {
    this._rows.push(row);
    this._versions.push(0);
  }

  public addRows(rows: any[]): void {
    this.rows.splice(this.rows.length, rows.length, ...rows);
    this._versions.splice(this.rows.length, rows.length, ...Array(rows.length));
  }

  public getVersion(row: any): number {
    const index = this._rows.indexOf(row);
    return index != -1 ? this._versions[index] : 0;
  }

  public replace(source: ISource): void {
    const oldCount = this._rows.length;
    const newCount = source.rows.length;
    this._rows.splice(0, oldCount, ...source.rows);
    if (oldCount > newCount) {
      this._versions.splice(newCount, oldCount - newCount);
    } else if (oldCount < newCount) {
      this._versions.splice(
        newCount,
        0,
        ...Array(newCount - oldCount).fill(-1)
      );
    }
    this._versions.forEach((ver, index, arr) => (arr[index] = ++ver));
    this.mergeType = source.mergeType ?? MergeType.replace;
    this.keyFieldName = source.keyFieldName;
    this.statusFieldName = source.statusFieldName;
    this.extra = source.extra;
  }
}
