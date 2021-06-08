import IContext from "../../context/IContext";
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
      var parts = part.split(".");
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

  async getValueAsync(wait: boolean = true): Promise<T> {
    var retVal: T = null;
    for (var i = 0; i < this.params.length; i++) {
      var item = this.params[i];
      if (item instanceof ValueTokenElement) {
        retVal = item.value;
      } else if (item instanceof SourceTokenElement) {
        if (item.member) {
          const sourceName = item.sourceName;
          var source = this.context.tryToGetSource(sourceName);
          if (item.column) {
            if (source == null) {
              //if is last item
              if (i + 1 == this.params.length) {
                if (item.source === "cms") {
                  break;
                }
                if (wait) {
                  source = await this.context.waitToGetSourceAsync(sourceName);
                } else {
                  break;
                }
              } else {
                continue;
              }
            }
            let value = null;
            try {
              value = item.extractValue(source);
            } catch (ex) {
              //console.error(ex);
            }
            if (value != null) {
              retVal = this.tryParse(value);
              break;
            } else {
              continue;
            }
          } else {
            retVal = this.tryParse(source ? "true" : "false");
            break;
          }
        } else {
          const result = await this.context.checkSourceHeartbeatAsync(
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
