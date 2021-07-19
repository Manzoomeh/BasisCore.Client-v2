import ISourceOptions from "../context/ISourceOptions";
import { MergeType, OriginType } from "../enum";
import { SourceId } from "../type-alias";

export default interface ISource {
  origin: OriginType;
  mergeType: MergeType;
  id: SourceId;
  rows: Array<any>;
  keyFieldName: string;
  statusFieldName: string;

  cloneOptions(): ISourceOptions;
}
