import ISourceOptions from "../context/ISourceOptions";
import { MergeType } from "../enum";
import { SourceId } from "../type-alias";
import ISource from "./ISource";

export default class Source implements ISource {
  keyFieldName: string;
  statusFieldName: string;
  readonly mergeType: MergeType;
  protected _rows: Array<any>;
  private _id: SourceId;
  public get id(): SourceId {
    return this._id;
  }
  public get rows(): Array<any> {
    return this._rows;
  }

  constructor(id: SourceId, data: any, options?: ISourceOptions) {
    this._id = id.toLowerCase();
    this.mergeType = options?.mergeType ?? MergeType.replace;
    this.keyFieldName = options?.keyFieldName;
    this.statusFieldName = options?.statusFieldName;

    if (Array.isArray(data)) {
      this._rows = data;
    } else if (typeof data === "object") {
      this._rows = [data];
    } else {
      this._rows = [{ value: data }];
    }
  }
  public cloneOptions(): ISourceOptions {
    return {
      keyFieldName: this.keyFieldName,
      mergeType: this.mergeType,
      statusFieldName: this.statusFieldName,
    };
  }
}
