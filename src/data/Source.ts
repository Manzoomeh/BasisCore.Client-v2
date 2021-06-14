import { MergeType, OriginType } from "../enum";
import IData from "./IData";
import ISource from "./ISource";

export default class Source implements ISource {
  readonly data: IData;
  readonly origin: OriginType;
  readonly mergeType: MergeType;
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
