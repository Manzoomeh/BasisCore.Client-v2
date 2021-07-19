import { MergeType, OriginType } from "../enum";

export default interface ISourceOptions {
  mergeType?: MergeType;
  keyFieldName?: string;
  statusFieldName?: string;
  origin?: OriginType;
}
