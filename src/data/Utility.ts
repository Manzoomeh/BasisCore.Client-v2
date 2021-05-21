import Data from "./Data";
import DataSource from "./DataSource";
import IData from "./IData";
import IDataSource from "./IDataSource";

export default class Util {
  //public static ToDataTable(tblName: string, rawTbl: Array<any>): IData
  public static ToDataTable(tblName: string, data: any): IData {
    let retVal: Data = null;
    var rows = null;
    if (typeof data === "object") {
      rows = [data];
    } else if (Array.isArray(data)) {
      rows = data;
    } else {
      rows = [{ value: data }];
    }
    return new Data(tblName, rows);
  }

  public static ToDataSource(tblName: string, data: any): IDataSource {
    const tbl = Util.ToDataTable(tblName, data);
    return new DataSource(tbl);
  }
}
