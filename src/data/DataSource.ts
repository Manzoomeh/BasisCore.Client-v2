import { DataSourceType } from "../enum";
import IData from "./IData";
import IDataSource from "./IDataSource";

export default class DataSource implements IDataSource {
  readonly Data: IData;
  readonly Type: DataSourceType;
  constructor(data: IData, type: DataSourceType = DataSourceType.Table) {
    this.Data = data;
    this.Type = type;
  }
}
