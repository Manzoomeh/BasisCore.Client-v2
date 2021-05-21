import { DataSourceType } from "../enum";
import IData from "./IData";

export default interface IDataSource {
  type: DataSourceType;
  data: IData;
  replace: boolean;
}
