import ISourceOptions from "../context/ISourceOptions";
import IHostOptions from "../options/IHostOptions";
import { SourceId } from "../type-alias";
import IBCWrapper from "./IBCWrapper";

export default interface IBCWrapperFactory {
  all: Array<IBCWrapper>;
  global: IBCWrapper;
  elementList: Array<Element>;
  addFragment(selector: string): IBCWrapper;
  addFragment(element: Element): IBCWrapper;
  addFragment(param: any): IBCWrapper;
  setOptions(options: IHostOptions): IBCWrapper;
  run(): IBCWrapper;
  setSource(
    sourceId: SourceId,
    data: any,
    options?: ISourceOptions
  ): IBCWrapper;
}
