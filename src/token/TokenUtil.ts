import IContext from "../context/IContext";
import Util from "../Util";
import ArrayToken from "./base/ArrayToken";
import ObjectToken from "./base/ObjectToken";
import ValueToken from "./base/ValueToken";
import BooleanArray from "./boolean/BooleanArray";
import BooleanObject from "./boolean/BooleanObject";
import BooleanValue from "./boolean/BooleanValue";
import IntegerArray from "./integer/IntegerArray";
import IntegerObject from "./integer/IntegerObject";
import IntegerValue from "./integer/IntegerValue";
import IToken from "./IToken";
import StringArray from "./string/StringArray";
import StringObject from "./string/StringObject";
import StringValue from "./string/StringValue";

export default class TokenUtil {
  public static ToStringToken(data: string, context: IContext): IToken<string> {
    return TokenUtil.ToToken<string>(
      data,
      context,
      (x) => new StringValue(x),
      (x) => new StringObject(x),
      (...x) => new StringArray(...x)
    );
  }
  public static ToIntegerToken(
    data: string,
    context: IContext
  ): IToken<number> {
    return TokenUtil.ToToken<number>(
      data,
      context,
      (x) => new IntegerValue(parseInt(x)),
      (x) => new IntegerObject(x),
      (...x) => new IntegerArray(...x)
    );
  }
  public static ToBooleanToken(
    data: string,
    context: IContext
  ): IToken<boolean> {
    return TokenUtil.ToToken<boolean>(
      data,
      context,
      (x) => new BooleanValue(Util.isEqual(x, "true")),
      (x) => new BooleanObject(x),
      (...x) => new BooleanArray(...x)
    );
  }

  public static ToToken<T>(
    data: string,
    context: IContext,
    newValueToken: { (data: string): ValueToken<T> },
    newObjectToken: { (data: string): ObjectToken<T> },
    newArrayToken: { (...data: IToken<string>[]): ArrayToken<T> }
  ): IToken<T> {
    //https://javascript.info/regexp-methods
    var tmp = context.options.getDefault("binding.regex");
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

  public static async GetValueOrDefaultAsync<T>(
    token: IToken<T>,
    context: IContext,
    defaultValue: T = null
  ): Promise<T> {
    return (await token?.getValueAsync(context)) || defaultValue;
  }

  static async GetValueOrSystemDefaultAsync<T>(
    token: IToken<string>,
    context: IContext,
    key: string
  ): Promise<string> {
    var retVal: string;
    if (Util.HasValue(token)) {
      retVal = await token.getValueAsync(context);
    } else {
      retVal = context.options.getDefault(key);
    }
    return retVal;
  }
}
