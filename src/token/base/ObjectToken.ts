import IContext from "../../context/IContext";
import IToken from "../IToken";
import SourceTokenElement from "../token-element/SourceTokenElement";
import { ValueTokenElement } from "../token-element/ValueTokenElement";
import ITokenElement from "../token-element/ITokenElement";

export default abstract class ObjectToken<TType> implements IToken<TType> {
  readonly parts: Array<ITokenElement>;
  readonly context: IContext;

  constructor(rawValue: string, context: IContext) {
    this.context = context;
    this.parts = rawValue.split("|").map((part) => {
      var partSlices = part.split(".");
      const matchValue = partSlices[0].match(/^\s*\((.*)\)\s*$/);
      return matchValue
        ? new ValueTokenElement<TType>(this.tryParse(matchValue[1]))
        : new SourceTokenElement<TType>(partSlices, part);
    });
  }

  getDefault(): TType {
    var part = this.parts.filter((x) => x instanceof ValueTokenElement);
    return (part[0] as ValueTokenElement<TType>)?.value ?? null;
  }

  getSourceNames(): string[] {
    return this.parts
      .filter((x) => x instanceof SourceTokenElement)
      .map((x: SourceTokenElement<TType>) => x.sourceName);
  }

  async getValueAsync(wait: boolean = true): Promise<TType> {
    var retVal: TType = null;
    for (var i = 0; i < this.parts.length; i++) {
      var item = this.parts[i];
      if (item instanceof ValueTokenElement) {
        retVal = item.value;
      } else if (item instanceof SourceTokenElement) {
        if (item.member) {
          const sourceName = item.sourceName;
          var source = this.context.tryToGetSource(sourceName);
          if (item.column) {
            if (source == null) {
              //if is last item
              if (i + 1 == this.parts.length) {
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
              /*Nothing*/
            }
            if (value != null && value !== "") {
              retVal = value as TType; //this.tryParse(value);
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

  abstract tryParse(value: string): TType;
}
