import { MergeType, OriginType } from "../enum";
import IData from "./IData";

export default interface ISource {
  origin: OriginType;
  data: IData;
  mergeType: MergeType;
}
