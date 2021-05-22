import Data from "./Data";
import DataSource from "./DataSource";
import IData from "./IData";
import IDataSource from "./IDataSource";

export default class DataUtil {
  public static ToDataTable(tblName: string, data: any): IData {
    var rows = null;
    if (Array.isArray(data)) {
      rows = data;
    } else if (typeof data === "object") {
      rows = [data];
    } else {
      rows = [{ value: data }];
    }
    return new Data(tblName, rows);
  }

  public static ToDataSource(
    tblName: string,
    data: any,
    replace: boolean = true
  ): IDataSource {
    const tbl = DataUtil.ToDataTable(tblName, data);
    return new DataSource(tbl, replace);
  }

  static ApplySimpleFilter(data: any[], columnName: string, columnValue: any) {
    var retVal: any[];

    if (typeof columnValue === "string" && columnValue.isEqual("null")) {
      retVal = data.filter((x) => x[columnName] === null);
    } else {
      retVal = data.filter((x) => x[columnName] == columnValue);
    }
    return retVal;
  }
}
