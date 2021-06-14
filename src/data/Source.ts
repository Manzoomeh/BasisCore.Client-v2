import { MergeType, OriginType } from "../enum";
import { SourceId } from "../type-alias";
import IData from "./IData";
import ISource from "./ISource";

export default class Source implements ISource {
  readonly data: IData;
  readonly origin: OriginType;
  readonly mergeType: MergeType;

  // protected _rows: Array<any>;
  // private _id: SourceId;
  // public get id(): SourceId {
  //   return this._id;
  // }
  // public get rows(): Array<any> {
  //   return this._rows;
  // }

  constructor(
    data: IData,
    mergeType: MergeType = MergeType.replace,
    origin: OriginType = OriginType.internal
  ) {
    this.data = data;
    this.origin = origin;
    this.mergeType = mergeType;
  }
}
