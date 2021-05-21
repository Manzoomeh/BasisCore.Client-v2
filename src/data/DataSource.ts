import { DataSourceType } from "../enum";
import IData from "./IData";
import IDataSource from "./IDataSource";

export default class DataSource implements IDataSource {
  readonly data: IData;
  readonly type: DataSourceType;
  readonly replace: boolean;
  constructor(
    data: IData,
    replace: boolean = true,
    type: DataSourceType = DataSourceType.Table
  ) {
    this.data = data;
    this.type = type;
    this.replace = replace;
  }
}
