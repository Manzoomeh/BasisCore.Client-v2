import GlobalContext from "./context/GlobalContext";
import { AppendType } from "./enum";
import { SourceId } from "./type-alias";

export default interface IBasisCore {
  setSource(sourceId: SourceId, data: any, appendType: AppendType);
  run(): void;
  context: GlobalContext;
}
