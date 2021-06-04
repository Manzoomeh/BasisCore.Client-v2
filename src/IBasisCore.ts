import { SourceId } from "./type-alias";

export default interface IBasisCore {
  setSource(sourceId: SourceId, data: any, replace: boolean);
  run(): void;
}
