import { SourceId } from "../type-alias";
import Data from "./Data";
import Source from "./Source";
import IData from "./IData";
import ISource from "./ISource";
import { MergeType, OriginType } from "../enum";

export default class DataUtil {
  public static ToDataTable(sourceId: SourceId, data: any): IData {
    var rows = null;
    if (Array.isArray(data)) {
      rows = data;
    } else if (typeof data === "object") {
      rows = [data];
    } else {
      rows = [{ value: data }];
    }
    return new Data(sourceId, rows);
  }

  public static ToDataSource(
    sourceId: SourceId,
    data: any,
    mergeType?: MergeType,
    origin?: OriginType
  ): ISource {
    const tbl = DataUtil.ToDataTable(sourceId, data);
    return new Source(tbl, mergeType, origin);
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

  public static addRowNumber(data: IData) {
    var index = 1;
    data.rows.forEach((row) => {
      row.rownumber = index++;
    });
    //data.updateColumnList();
  }
}
