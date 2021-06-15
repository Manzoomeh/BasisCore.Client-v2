import { SourceId } from "../type-alias";
import Source from "./Source";
import ISource from "./ISource";
import { MergeType, OriginType } from "../enum";

export default class DataUtil {
  static ApplySimpleFilter(data: any[], columnName: string, columnValue: any) {
    var retVal: any[];

    if (typeof columnValue === "string" && columnValue.isEqual("null")) {
      retVal = data.filter((x) => x[columnName] === null);
    } else {
      retVal = data.filter((x) => x[columnName] == columnValue);
    }
    return retVal;
  }

  public static addRowNumber(data: Array<any>) {
    var index = 1;
    data.forEach((row) => {
      row.rownumber = index++;
    });
    //data.updateColumnList();
  }
}
