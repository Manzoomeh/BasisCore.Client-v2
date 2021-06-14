import RootContext from "./context/RootContext";
import { MergeType } from "./enum";
import { SourceId } from "./type-alias";

export default interface IBasisCore {
  setSource(sourceId: SourceId, data: any, mergeType: MergeType);
  context: RootContext;
}
