import { MergeType } from "../enum";
import { SourceId } from "../type-alias";

export default class Data {
  public readonly rows: Array<any>;
  public readonly id: SourceId;
  public readonly mergeType: MergeType;

  constructor(id: SourceId, data: any, mergeType?: MergeType) {
    this.id = id;
    this.mergeType = mergeType ?? MergeType.replace;
    if (Array.isArray(data)) {
      this.rows = data;
    } else if (typeof data === "object") {
      this.rows = [data];
    } else {
      this.rows = [{ value: data }];
    }
  }
}
