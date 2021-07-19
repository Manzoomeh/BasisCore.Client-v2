import ISourceOptions from "../context/ISourceOptions";
import { SourceId } from "../type-alias";

export default class Data {
  public readonly rows: Array<any>;
  public readonly id: SourceId;
  public readonly options?: ISourceOptions;

  constructor(id: SourceId, data: any, options?: ISourceOptions) {
    this.id = id;
    this.options = options;

    if (Array.isArray(data)) {
      this.rows = data;
    } else if (typeof data === "object") {
      this.rows = [data];
    } else {
      this.rows = [{ value: data }];
    }
  }
}
