﻿import IContext from "../context/IContext";
import IToken from "../token/IToken";
import Util from "../Util";

declare global {
  interface Element {
    GetObjectToken(attributeName: string, context: IContext): IToken<any>;
    GetStringToken(attributeName: string, context: IContext): IToken<string>;
    GetIntegerToken(attributeName: string, context: IContext): IToken<number>;
    GetBooleanToken(attributeName: string, context: IContext): IToken<boolean>;
    GetTemplateToken(context: IContext): IToken<string>;
    getTemplate(): string;
    GetXMLTemplateToken(context: IContext): IToken<string>;
    getXMLTemplate(): string;
    isBasisCore(): boolean;
    isBasisTag(): boolean;
    isIgnoreTag(): boolean;
  }
}

Object.defineProperty(Element.prototype, "GetObjectToken", {
  value: function GetObjectToken(attributeName: string, context: IContext) {
    var retVal: IToken<any>;
    var tmp = <string>this.getAttribute(attributeName);
    if (tmp) {
      retVal = tmp.ToObjectToken(context);
    }
    return retVal;
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(Element.prototype, "GetStringToken", {
  value: function GetStringToken(attributeName: string, context: IContext) {
    var retVal: IToken<String>;
    var tmp = <string>this.getAttribute(attributeName);
    if (tmp) {
      retVal = tmp.ToStringToken(context);
    }
    return retVal;
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(Element.prototype, "GetIntegerToken", {
  value: function GetIntegerToken(attributeName: string, context: IContext) {
    var retVal: IToken<number>;
    var tmp = <string>this.getAttribute(attributeName);
    if (tmp) {
      retVal = tmp.ToIntegerToken(context);
    }
    return retVal;
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(Element.prototype, "GetBooleanToken", {
  value: function GetBooleanToken(attributeName: string, context: IContext) {
    var retVal: IToken<boolean>;
    var tmp = <string>this.getAttribute(attributeName);
    if (tmp) {
      retVal = tmp.ToBooleanToken(context);
    }
    return retVal;
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(Element.prototype, "GetTemplateToken", {
  value: function GetTemplateToken(context: IContext) {
    return this.getTemplate().ToStringToken(context);
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(Element.prototype, "getTemplate", {
  value: function getTemplate() {
    var retVal: string;
    if (
      this.children.length == 1 &&
      Util.isEqual(this.children[0].nodeName, "script") &&
      Util.isEqual(this.children[0].getAttribute("type"), "text/template")
    ) {
      retVal = this.textContent;
    } else {
      retVal = this.innerHTML;
    }
    return retVal;
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(Element.prototype, "GetXMLTemplateToken", {
  value: function GetXMLTemplateToken(context: IContext) {
    return this.getXMLTemplate().ToStringToken(context);
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(Element.prototype, "getXMLTemplate", {
  value: function getXMLTemplate() {
    var retVal: string;
    if (
      this.children.length == 1 &&
      Util.isEqual(this.children[0].nodeName, "script") &&
      Util.isEqual(this.children[0].getAttribute("type"), "text/template")
    ) {
      retVal = this.children[0].outerHTML;
    } else {
      retVal = `<basis-core-template-tag>${this.innerHTML}</basis-core-template-tag>`;
    }
    return retVal;
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(Element.prototype, "isBasisCore", {
  value: function isBasisCore() {
    try {
      return (
        this.nodeType == Node.ELEMENT_NODE &&
        this.nodeName == "BASIS" &&
        Util.isEqual(this.getAttribute("run"), "atclient")
      );
    } catch {
      return false;
    }
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(Element.prototype, "isBasisTag", {
  value: function isBasisTag() {
    try {
      return (
        this.nodeType == Node.ELEMENT_NODE && this.hasAttribute("bc-triggers")
      );
    } catch {
      return false;
    }
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(Element.prototype, "isIgnoreTag", {
  value: function isIgnoreTag() {
    try {
      return (
        this.nodeType == Node.ELEMENT_NODE && this.hasAttribute("bc-ignore")
      );
    } catch {
      return false;
    }
  },
  writable: true,
  configurable: true,
});
