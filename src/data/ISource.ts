import { SourceType } from "../enum";
import IData from "./IData";

export default interface ISource {
  type: SourceType;
  data: IData;
  replace: boolean;
}
