import ISourceOptions from "../context/ISourceOptions";
import { MergeType } from "../enum";
import { SourceId } from "../type-alias";

export default interface ISource {
  mergeType: MergeType;
  id: SourceId;
  rows: Array<any>;
  keyFieldName: string;
  statusFieldName: string;

  cloneOptions(): ISourceOptions;
}
