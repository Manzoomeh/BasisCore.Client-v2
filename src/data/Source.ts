import { MergeType, OriginType } from "../enum";
import { SourceId } from "../type-alias";

import ISource from "./ISource";

export default class Source implements ISource {
  readonly origin: OriginType;
  readonly mergeType: MergeType;
  protected _rows: Array<any>;
  private _id: SourceId;
  public get id(): SourceId {
    return this._id;
  }
  public get rows(): Array<any> {
    return this._rows;
  }

  constructor(
    id: SourceId,
    data: any,
    mergeType: MergeType = MergeType.replace,
    origin: OriginType = OriginType.internal
  ) {
    this._id = id.toLowerCase();
    this.origin = origin;
    this.mergeType = mergeType;

    if (Array.isArray(data)) {
      this._rows = data;
    } else if (typeof data === "object") {
      this._rows = [data];
    } else {
      this._rows = [{ value: data }];
    }
  }
}
