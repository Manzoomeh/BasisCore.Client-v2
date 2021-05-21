import IToken from "../token/IToken";
import Util from "../Util";

declare global {
  interface Element {
    GetStringToken(attributeName: string): IToken<string>;
    GetIntegerToken(attributeName: string): IToken<number>;
    GetBooleanToken(attributeName: string): IToken<boolean>;
    GetTemplateToken(): IToken<string>;
    IsBasisCore(): boolean;
  }
}
Object.defineProperty(Element.prototype, "GetStringToken", {
  value: function GetStringToken(attributeName: string) {
    var retVal: IToken<String>;
    var tmp = <string>this.getAttribute(attributeName);
    if (tmp) {
      retVal = tmp.ToStringToken();
    }
    return retVal;
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(Element.prototype, "GetIntegerToken", {
  value: function GetIntegerToken(attributeName: string) {
    var retVal: IToken<number>;
    var tmp = <string>this.getAttribute(attributeName);
    if (tmp) {
      retVal = tmp.ToIntegerToken();
    }
    return retVal;
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(Element.prototype, "GetBooleanToken", {
  value: function GetBooleanToken(attributeName: string) {
    var retVal: IToken<boolean>;
    var tmp = <string>this.getAttribute(attributeName);
    if (tmp) {
      retVal = tmp.ToBooleanToken();
    }
    return retVal;
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(Element.prototype, "GetTemplateToken", {
  value: function GetTemplateToken() {
    var retVal: IToken<string>;
    if (
      this.children.length == 1 &&
      Util.IsEqual(this.children[0].nodeName, "script") &&
      Util.IsEqual(this.children[0].getAttribute("type"), "text/template")
    ) {
      retVal = this.textContent.ToStringToken();
    } else {
      retVal = this.innerHTML.ToStringToken();
    }
    return retVal;
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(Element.prototype, "IsBasisCore", {
  value: function IsBasisCore() {
    try {
      return (
        this.nodeType == Node.ELEMENT_NODE &&
        this.nodeName == "BASIS" &&
        Util.IsEqual(this.getAttribute("run"), "atclient")
      );
    } catch {
      return false;
    }
  },
  writable: true,
  configurable: true,
});
