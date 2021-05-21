import ClientException from "../exception/ClientException";
import IToken from "../token/IToken";
import Util from "../Util";

declare global {
  interface String {
    Evaluating(): boolean;
    ToStringToken(): IToken<string>;
    ToIntegerToken(): IToken<number>;
    ToBooleanToken(): IToken<boolean>;
    IsEqual(value: string);
  }
}

Object.defineProperty(String.prototype, "Evaluating", {
  value: function Evaluating() {
    try {
      return Util.IsEqual(eval(this.toString())?.toString(), "true");
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
  value: function ToStringToken() {
    return Util.ToStringToken(this.toString());
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(String.prototype, "ToIntegerToken", {
  value: function ToIntegerToken() {
    return Util.ToIntegerToken(this.toString());
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(String.prototype, "ToBooleanToken", {
  value: function ToBooleanToken() {
    return Util.ToBooleanToken(this.toString());
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(String.prototype, "IsEqual", {
  value: function IsEqual(value: string) {
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
