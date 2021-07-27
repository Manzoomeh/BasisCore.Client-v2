import ISourceOptions from "../context/ISourceOptions";
import IHostOptions from "../options/IHostOptions";
import { SourceId } from "../type-alias";

export default interface IBCWrapper {
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
