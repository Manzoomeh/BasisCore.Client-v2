﻿import IContext from "../../context/IContext";
import IToken from "../IToken";
import SourceTokenElement from "../token-element/SourceTokenElement";
import { ValueTokenElement } from "../token-element/ValueTokenElement";
import ITokenElement from "../token-element/ITokenElement";

export default abstract class ObjectToken<T> implements IToken<T> {
  readonly params: Array<ITokenElement>;
  readonly context: IContext;
  constructor(rawValue: string, context: IContext) {
    this.context = context;
    this.params = rawValue.split("|").map((part) => {
      var parts = part.toLowerCase().split(".");
      const matchValue = parts[0].match(/^\s*\((.*)\)\s*$/);
      return matchValue
        ? new ValueTokenElement<T>(this.tryParse(matchValue[1]))
        : new SourceTokenElement(parts);
    });
  }
  getDefault(): T {
    var t = this.params.filter((x) => x instanceof ValueTokenElement);
    return t.length != 0 ? (t[0] as ValueTokenElement<T>).value : null;
  }
  getSourceNames(): string[] {
    return this.params
      .filter((x) => x instanceof SourceTokenElement)
      .map((x: SourceTokenElement) => x.sourceName);
  }
  private static HasValue(data: any): boolean {
    return data !== undefined && data != null;
  }
  async getValueAsync(wait: boolean = true): Promise<T> {
    var retVal: T = null;
    for (var i = 0; i < this.params.length; i++) {
      var item = this.params[i];
      var isLastItem = i + 1 == this.params.length;
      if (item instanceof ValueTokenElement) {
        retVal = item.value;
      } else if (item instanceof SourceTokenElement) {
        if (ObjectToken.HasValue(item.member)) {
          const sourceName = item.sourceName;
          var dataSource = this.context.repository.tryToGet(sourceName);
          if (ObjectToken.HasValue(item.column)) {
            if (dataSource == null) {
              if (isLastItem) {
                if (sourceName.startsWith("cms.")) {
                  break;
                }
                if (wait) {
                  dataSource = await this.context.repository.waitToGetAsync(
                    sourceName
                  );
                } else {
                  break;
                }
              } else {
                continue;
              }
            }
            var columnName = item.column.toLowerCase();
            if (dataSource.data.Columns.indexOf(columnName) == -1) {
              if (isLastItem) {
                break;
              } else {
                continue;
              }
            }
            if (dataSource.data.Rows.length == 1) {
              var columnRawValue = dataSource.data.Rows[0][columnName];
              var columnValue = "";
              try {
                columnValue = columnRawValue.toString();
              } catch {
                /*Nothing*/
              }
              if (!ObjectToken.HasValue(columnRawValue) || columnValue === "") {
                //if value in source is null or blank,process next source
                if (!isLastItem) {
                  continue;
                }
              } else {
                retVal = this.tryParse(columnValue);
                break;
              }
            } else if (dataSource.data.Rows.length > 1) {
              try {
                var sb = "";
                var data = dataSource.data.Rows.filter((x) =>
                  ObjectToken.HasValue(x[columnName])
                ).map((x) => x[columnName]);
                data.forEach((item) => {
                  if (sb.length > 0) {
                    sb += ",";
                  }
                  sb += item;
                });
                retVal = this.tryParse(sb);
                break;
              } catch {
                /*Nothing*/
              }
            }
          } else {
            var result = ObjectToken.HasValue(dataSource);
            retVal = this.tryParse(result.toString());
            break;
          }
        } else {
          var result = await this.context.checkSourceHeartbeatAsync(
            item.source
          );
          retVal = this.tryParse(result.toString());
          break;
        }
      }
    }
    return retVal;
  }

  abstract tryParse(value: string): T;
}