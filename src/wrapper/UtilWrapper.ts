import { cloneDeep } from "lodash";
import { SourceWrapper } from "./SourceWrapper";

export default class UtilWrapper {
  readonly source: SourceWrapper = new SourceWrapper();

  public clone(obj): any {
    return cloneDeep(obj);
  }
}
