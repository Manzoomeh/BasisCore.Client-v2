import { DataSourceType } from "../enum";
import IData from "./IData";

export default interface IDataSource {
  Type: DataSourceType;
  Data: IData;
}
