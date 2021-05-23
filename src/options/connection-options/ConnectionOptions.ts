import IContext from "../../context/IContext";
import IData from "../../data/IData";
import ClientException from "../../exception/ClientException";
import IDictionary from "../../IDictionary";

export default abstract class ConnectionOptions {
  readonly Name: string;
  constructor(name: string) {
    this.Name = name;
  }
  abstract TestConnectionAsync(context: IContext): Promise<boolean>;
  // abstract LoadDataAsync(
  //   context: IContext,
  //   sourceName: string,
  //   parameters: IDictionary<string>
  // ): Promise<IData>;
  abstract LoadPageAsync(
    context: IContext,
    pageName: string,
    parameters: IDictionary<string>
  ): Promise<string>;

  public ParseJsonString(json: string): ParsedData {
    try {
      var obj: IDictionary<any[]> = JSON.parse(json);
      return this.ConvertObject(obj);
    } catch (ex) {
      throw new ClientException(`Invalid Json Format:${json}.${ex}`);
    }
  }

  public ConvertObject(obj: IDictionary<any[]>): ParsedData {
    var retVal = new ParsedData();
    try {
      retVal.Setting = obj["_"];
    } catch {}
    Object.getOwnPropertyNames(obj).forEach((tblName) => {
      if (tblName !== "_") {
        var rawTbl = obj[tblName];
        var cols = <string[]>rawTbl.shift();
        //for add case insensitive to alasql lib
        cols = cols?.map((x) => x.toLowerCase().trim()) ?? [];
        var rows = new Array<any>();
        rawTbl.forEach((rawRow) => {
          var row = {};
          cols.forEach((col, index) => {
            row[col] = rawRow[index];
          });
          rows.push(row);
        });

        retVal.Tables.push(new Pair(tblName, rows));
      }
    });
    return retVal;
  }
}

export class ParsedData {
  Setting: any;
  Tables: Array<Pair<string, any[]>> = [];
}

export class Pair<K, V> {
  constructor(readonly Key: K, readonly Value: V) {}
}
