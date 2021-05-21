import IBasisCore from "./IBasisCore";
import IContext from "./context/IContext";
import IData from "./data/IData";
import ArrayToken from "./token/base/ArrayToken";
import ObjectToken from "./token/base/ObjectToken";
import ValueToken from "./token/base/ValueToken";
import BooleanArray from "./token/boolean/BooleanArray";
import BooleanObject from "./token/boolean/BooleanObject";
import BooleanValue from "./token/boolean/BooleanValue";
import IntegerArray from "./token/integer/IntegerArray";
import IntegerObject from "./token/integer/IntegerObject";
import IntegerValue from "./token/integer/IntegerValue";
import IToken from "./token/IToken";
import StringArray from "./token/string/StringArray";
import StringObject from "./token/string/StringObject";
import StringValue from "./token/string/StringValue";

declare let $bc: IBasisCore;

export default class Util {
  public static HasValue(data: any): boolean {
    return data !== undefined && data != null;
  }

  public static IsEqual(stringA: string, stringB: string): boolean {
    return (stringA || "").IsEqual(stringB);
  }

  public static ToStringToken(data: string): IToken<string> {
    return Util.ToToken<string>(
      data,
      (x) => new StringValue(x),
      (x) => new StringObject(x),
      (...x) => new StringArray(...x)
    );
  }
  public static ToIntegerToken(data: string): IToken<number> {
    return Util.ToToken<number>(
      data,
      (x) => new IntegerValue(parseInt(x)),
      (x) => new IntegerObject(x),
      (...x) => new IntegerArray(...x)
    );
  }
  public static ToBooleanToken(data: string): IToken<boolean> {
    return Util.ToToken<boolean>(
      data,
      (x) => new BooleanValue(Util.IsEqual(x, "true")),
      (x) => new BooleanObject(x),
      (...x) => new BooleanArray(...x)
    );
  }

  public static ToToken<T>(
    data: string,
    newValueToken: { (data: string): ValueToken<T> },
    newObjectToken: { (data: string): ObjectToken<T> },
    newArrayToken: { (...data: IToken<string>[]): ArrayToken<T> }
  ): IToken<T> {
    //https://javascript.info/regexp-methods
    var tmp = $bc.GetDefault("binding.regex");
    var retVal: IToken<T>;
    if (Util.HasValue(data)) {
      var match = data.match(tmp);
      if (!match) {
        retVal = newValueToken(data);
      } else {
        var list = new Array<any>();
        do {
          if (match.index != 0) {
            list.push(newValueToken(match.input.substring(0, match.index)));
          }
          list.push(newObjectToken(match[1]));
          data = data.substring(match.index + match[0].length);
          match = data.match(tmp);
        } while (match);
        if (data.length > 0) {
          list.push(newValueToken(data));
        }
        if (list.length == 1) {
          retVal = list[0];
        } else {
          retVal = newArrayToken(...list);
        }
      }
    }
    return retVal;
  }

  public static Equal(a: any, b: any): boolean {
    var retVal: boolean = true;
    if (!Util.HasValue(a) || !Util.HasValue(b)) {
      retVal = false;
    } else {
      var aProps = Object.getOwnPropertyNames(a);
      var bProps = Object.getOwnPropertyNames(b);
      if (aProps.length != bProps.length) {
        retVal = false;
      } else {
        for (var i = 0; i < aProps.length; i++) {
          var propName = aProps[i];
          if (a[propName] !== b[propName]) {
            retVal = false;
            break;
          }
        }
      }
    }
    return retVal;
  }

  public static ReplaceEx(
    source: string,
    searchValue: string,
    replaceValue: string
  ): string {
    return source.replace(new RegExp(searchValue, "gi"), replaceValue);
  }

  public static async GetValueOrDefaultAsync<T>(
    token: IToken<T>,
    context: IContext,
    defaultValue: T = null
  ): Promise<T> {
    return (await token?.getValueAsync(context)) || defaultValue;
  }

  public static IsNullOrEmpty(data: string): boolean {
    return data === undefined || data == null || data === "";
  }

  static async ApplyFilterAsync(source: IData, filter: string): Promise<any[]> {
    var retVal: any[];
    if (Util.IsNullOrEmpty(filter)) {
      retVal = source.Rows;
    } else {
      var lib = await $bc.GetOrLoadDbLibAsync();
      retVal = lib(`SELECT * FROM ? where ${filter}`, [source.Rows]);
    }
    return retVal;
  }
}
