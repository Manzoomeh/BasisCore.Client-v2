import RootContext from "./context/RootContext";
import { AppendType } from "./enum";
import { SourceId } from "./type-alias";

export default interface IBasisCore {
  setSource(sourceId: SourceId, data: any, appendType: AppendType);
  context: RootContext;
}
