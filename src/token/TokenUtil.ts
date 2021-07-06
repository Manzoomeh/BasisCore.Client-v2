import IContext from "../context/IContext";
import Util from "../Util";
import ArrayToken from "./base/ArrayToken";
import ObjectToken from "./base/ObjectToken";
import ValueToken from "./base/ValueToken";
import CodeBlockToken from "./CodeBlockToken";
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
      (x) => new StringValue(x, context),
      (x) => new StringObject(x, context),
      (...x) => new StringArray(context, ...x)
    );
  }
  public static ToIntegerToken(
    data: string,
    context: IContext
  ): IToken<number> {
    return TokenUtil.ToToken<number>(
      data,
      context,
      (x) => new IntegerValue(parseInt(x), context),
      (x) => new IntegerObject(x, context),
      (...x) => new IntegerArray(context, ...x)
    );
  }
  public static ToBooleanToken(
    data: string,
    context: IContext
  ): IToken<boolean> {
    return TokenUtil.ToToken<boolean>(
      data,
      context,
      (x) => new BooleanValue(Util.isEqual(x, "true"), context),
      (x) => new BooleanObject(x, context),
      (...x) => new BooleanArray(context, ...x)
    );
  }

  // public static ToToken<T>(
  //   content: string,
  //   context: IContext,
  //   newValueToken: { (data: string): ValueToken<T> },
  //   newObjectToken: { (data: string): ObjectToken<T> },
  //   newArrayToken: { (...data: IToken<string>[]): ArrayToken<T> }
  // ): IToken<T> {
  //   //https://javascript.info/regexp-methods
  //   var regex = context.options.getDefault<RegExp>("binding.regex");
  //   var retVal: IToken<T>;
  //   if (Util.HasValue(content)) {
  //     var match = content.match(regex);
  //     if (!match) {
  //       retVal = newValueToken(content);
  //     } else {
  //       var list = new Array<any>();
  //       do {
  //         if (match.index != 0) {
  //           list.push(newValueToken(match.input.substring(0, match.index)));
  //         }
  //         list.push(newObjectToken(match[1]));
  //         content = content.substring(match.index + match[0].length);
  //         match = content.match(regex);
  //       } while (match);
  //       if (content.length > 0) {
  //         list.push(newValueToken(content));
  //       }
  //       if (list.length == 1) {
  //         retVal = list[0];
  //       } else {
  //         retVal = newArrayToken(...list);
  //       }
  //     }
  //   }
  //   return retVal;
  // }
  public static ToToken<T>(
    content: string,
    context: IContext,
    newValueToken: { (data: string): ValueToken<T> },
    newObjectToken: { (data: string): ObjectToken<T> },
    newArrayToken: { (...data: IToken<string>[]): ArrayToken<T> }
  ): IToken<T> {
    //https://javascript.info/regexp-methods

    var retVal: IToken<T>;
    if (content) {
      const regex = context.options.getDefault<RegExp>("binding.regex");
      const blockRegex = context.options.getDefault<RegExp>(
        "binding.codeblock-regex"
      );
      var list = new Array<any>();
      do {
        let match = content.match(regex);
        if (!match) {
          match = content.match(blockRegex);
          if (!match) {
            list.push(newValueToken(content));
            break;
          } else {
            if (match.index != 0) {
              list.push(newValueToken(content.substring(0, match.index)));
            }
            list.push(new CodeBlockToken(match[1], context));
            content = content.substring(match.index + match[0].length);
          }
        } else {
          if (match.index != 0) {
            list.push(newValueToken(content.substring(0, match.index)));
          }
          list.push(newObjectToken(match[1]));
          content = content.substring(match.index + match[0].length);
        }
      } while (content.length > 0);
      if (list.length == 1) {
        retVal = list[0];
      } else {
        retVal = newArrayToken(...list);
      }
    }
    return retVal;
  }

  // public static async GetValueOrDefaultAsync<T>(
  //   token: IToken<T>,
  //   defaultValue: T = null
  // ): Promise<T> {
  //   return (await token?.getValueAsync()) || defaultValue;
  // }

  static async GetValueOrSystemDefaultAsync<T>(
    token: IToken<string>,
    context: IContext,
    key: string
  ): Promise<string> {
    var retVal: string;
    if (Util.HasValue(token)) {
      retVal = await token.getValueAsync();
    } else {
      retVal = context.options.getDefault(key);
    }
    return retVal;
  }
}
