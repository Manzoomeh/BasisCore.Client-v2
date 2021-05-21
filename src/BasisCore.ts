import TextComponent from "./component/TextComponent";
import IComponent from "./component/IComponent";
import UnknoneCommand from "./component/UnknoneCommand";
import ClientException from "./exception/ClientException";
import { AttributeComponent } from "./component/AttributeComponent";
import IBasisCore from "./IBasisCore";
import Util from "./Util";

import { inject, singleton } from "tsyringe";
import GlobalContext from "./context/GlobalContext";
import { HostOptions } from "./options/HostOptions";

declare var alasql: any;

@singleton()
export default class BasisCore implements IBasisCore {
  readonly componnet: Array<IComponent>;
  readonly regex: string;
  readonly context: GlobalContext;
  public readonly HostOptions: HostOptions;

  constructor(hostOptions: HostOptions, context: GlobalContext) {
    this.regex = this.GetDefault("binding.regex");
    this.componnet = new Array<IComponent>();
    this.HostOptions = hostOptions;
    this.context = context;
  }
  addSource(sourecName: string, data: any) {
    this.context.addAsSource(sourecName, data);
  }

  public f(): void {
    console.log("hi");
  }

  public GetDefault(key: string, defaultValue: string = null): string {
    let retVal = defaultValue;
    switch (key) {
      case "binding.regex":
        retVal = "\\[##([^#]*)##\\]";
        break;

      default:
        break;
    }
    return retVal;
  }

  AddArea(selector: string): void;
  AddArea(element?: Element): void;
  AddArea(param?: any): void {
    var element: Element;
    if (typeof param === "string") {
      element = document.querySelector(param);
    } else if (param instanceof Element) {
      element = param;
    } else {
      throw new ClientException("Invalid Argument");
    }
    this.extractComponnect(element);
  }

  public UpdateData() {}

  async GetOrLoadDbLibAsync(): Promise<any> {
    var retVal;
    if (typeof alasql === "undefined") {
      if (Util.IsNullOrEmpty(this.HostOptions.DbLibPath)) {
        throw new ClientException(
          `Error in load 'alasql'. 'DbLibPath' Not Configure Properly In Host Object.`
        );
      }
      retVal = await this.GetOrLoadObjectAsync(
        "alasql",
        this.HostOptions.DbLibPath
      );
    } else {
      retVal = alasql;
    }
    return retVal;
  }

  public GetOrLoadObjectAsync(object: string, url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (eval(`typeof(${object})`) === "undefined") {
        var script = document.createElement("script");
        script.onload = (x) => resolve(eval(object));
        script.onerror = (x) => reject(x);
        script.setAttribute("type", "text/javascript");
        script.setAttribute("src", url);
        document.getElementsByTagName("head")[0].appendChild(script);
      } else {
        resolve(eval(object));
      }
    });
  }

  private extractComponnect(containner: Element) {
    this.ExtratcBasisCommands(containner);
    this.extractBindingComponents(containner);
  }
  private ExtratcBasisCommands(element: Element) {
    const elements = Array.from(element.getElementsByTagName("basis"));
    for (const item of elements) {
      this.componnet.push(new UnknoneCommand(item, this.context));
    }
  }
  private getTextComponent(element: Node) {
    var content = element.textContent;
    if (content.trim().length != 0) {
      var match = content.match(this.regex);
      if (match) {
        var com = new TextComponent(
          element,
          this.context,
          match.index,
          match.index + match[0].length
        );
        this.componnet.push(com);
      }
    }
  }
  private extractAttributeComponent(element: Element) {
    for (const pair of Array.from(element.attributes)) {
      if (pair.value.trim().length != 0) {
        var match = pair.value.match(this.regex);
        if (match) {
          const com = new AttributeComponent(element, this.context, pair);
          this.componnet.push(com);
        }
      }
    }
  }
  private extractBindingComponents(element: Node) {
    if (element.nodeType == Node.TEXT_NODE) {
      this.getTextComponent(element);
    } else {
      if (element instanceof Element)
        if (element.tagName != "BASIS") {
          this.extractAttributeComponent(element);
          if (element.hasChildNodes()) {
            for (const child of Array.from(element.childNodes)) {
              this.extractBindingComponents(child);
            }
          } else {
            this.getTextComponent(element);
          }
        }
    }
  }
}
