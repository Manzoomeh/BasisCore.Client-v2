import { AppendType, SourceType } from "../enum";
import IData from "./IData";
import ISource from "./ISource";

export default class Source implements ISource {
  readonly data: IData;
  readonly type: SourceType;
  readonly appendType: AppendType;
  constructor(
    data: IData,
    replace: AppendType,
    type: SourceType = SourceType.internal
  ) {
    this.data = data;
    this.type = type;
    this.appendType = replace;
  }
}
