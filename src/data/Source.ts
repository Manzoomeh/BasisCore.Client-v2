import { SourceType } from "../enum";
import IData from "./IData";
import ISource from "./ISource";

export default class Source implements ISource {
  readonly data: IData;
  readonly type: SourceType;
  readonly replace: boolean;
  constructor(
    data: IData,
    replace: boolean = true,
    type: SourceType = SourceType.Table
  ) {
    this.data = data;
    this.type = type;
    this.replace = replace;
  }
}
