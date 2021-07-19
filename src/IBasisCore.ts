import ISourceOptions from "./context/ISourceOptions";
import RootContext from "./context/RootContext";
import { SourceId } from "./type-alias";

export default interface IBasisCore {
  setSource(sourceId: SourceId, data: any, options?: ISourceOptions);
  context: RootContext;
}
