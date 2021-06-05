import { AppendType, SourceType } from "../enum";
import IData from "./IData";

export default interface ISource {
  type: SourceType;
  data: IData;
  appendType: AppendType;
}
