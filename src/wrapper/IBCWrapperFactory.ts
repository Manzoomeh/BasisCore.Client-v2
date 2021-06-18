import BCLinker from "../BCLinker";
import { MergeType } from "../enum";
import IHostOptions from "../options/IHostOptions";
import { SourceId } from "../type-alias";
import BCWrapper from "./BCWrapper";
import IBCUtil from "./IBCUtil";

export default interface IBCWrapperFactory extends IBCUtil {
  all: Array<BCWrapper>;
  global: BCWrapper;
  addFragment(selector: string): BCWrapper;
  addFragment(element: Element): BCWrapper;
  addFragment(param: any): BCWrapper;
  setOptions(options: IHostOptions): BCWrapper;
  run(): BCWrapper;
  setSource(sourceId: SourceId, data: any, mergeType?: MergeType);
  linker(): BCLinker;
  //Ops... comment for prevent error
  //new(): BCWrapper;
}
