import IContext from "../../context/IContext";
import Data from "../../data/Data";
import { EventHandlerWithReturn } from "../../event/EventHandlerWithReturn";
import ClientException from "../../exception/ClientException";
import IDictionary from "../../IDictionary";
import { HttpMethod, SourceId } from "../../type-alias";

export default abstract class ConnectionOptions {
  readonly Name: string;
  constructor(name: string) {
    this.Name = name;
  }

  abstract TestConnectionAsync(context: IContext): Promise<boolean>;

  public abstract loadDataAsync(
    context: IContext,
    sourceId: SourceId,
    parameters: IDictionary<string>,
    onDataReceived: EventHandlerWithReturn<Array<Data>, boolean>
  ): Promise<void>;

  public abstract loadPageAsync(
    context: IContext,
    pageName: string,
    parameters: IDictionary<string>,
    method?: HttpMethod
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
        //cols = cols?.map((x) => x.toLowerCase().trim()) ?? [];
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

class ParsedData {
  Setting: any;
  Tables: Array<Pair<string, any[]>> = [];
}

class Pair<K, V> {
  constructor(readonly Key: K, readonly Value: V) {}
}
