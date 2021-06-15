import { MergeType } from "../enum";
import { SourceId } from "../type-alias";

export default class Data {
  public readonly rows: Array<any>;
  public readonly id: SourceId;
  public readonly mergeType: MergeType;

  constructor(id: SourceId, rows: Array<any>, mergeType: MergeType) {
    this.id = id;
    this.rows = rows;
    this.mergeType = mergeType;
  }
}
