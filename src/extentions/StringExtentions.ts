import IContext from "../context/IContext";
import ClientException from "../exception/ClientException";
import IToken from "../token/IToken";
import TokenUtil from "../token/TokenUtil";
import Util from "../Util";

declare global {
  interface String {
    Evaluating(): boolean;
    ToStringToken(context: IContext): IToken<string>;
    ToIntegerToken(context: IContext): IToken<number>;
    ToBooleanToken(context: IContext): IToken<boolean>;
    isEqual(value: string);
  }
}

Object.defineProperty(String.prototype, "Evaluating", {
  value: function Evaluating() {
    try {
      return Util.isEqual(eval(this.toString())?.toString(), "true");
    } catch (er) {
      throw new ClientException(
        `Error In Evaluating '${this.toString()}': ${er}`
      );
    }
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(String.prototype, "ToStringToken", {
  value: function ToStringToken(context: IContext) {
    return TokenUtil.ToStringToken(this.toString(), context);
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(String.prototype, "ToIntegerToken", {
  value: function ToIntegerToken(context: IContext) {
    return TokenUtil.ToIntegerToken(this.toString(), context);
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(String.prototype, "ToBooleanToken", {
  value: function ToBooleanToken(context: IContext) {
    return TokenUtil.ToBooleanToken(this.toString(), context);
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(String.prototype, "isEqual", {
  value: function isEqual(value: string) {
    var stringA = this.toString();
    return (
      stringA.localeCompare(value ?? "", undefined, {
        sensitivity: "accent",
      }) == 0
    );
  },
  writable: true,
  configurable: true,
});
