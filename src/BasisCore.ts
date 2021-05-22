import TextComponent from "./component/TextComponent";
import IComponent from "./component/IComponent";
import ClientException from "./exception/ClientException";
import { AttributeComponent } from "./component/AttributeComponent";
import IBasisCore from "./IBasisCore";
import Util from "./Util";
import { container, singleton } from "tsyringe";
import GlobalContext from "./context/GlobalContext";
import CommandComponent from "./component/CommandComponent";
import Context from "./context/Context";

declare var alasql: any;

@singleton()
export default class BasisCore implements IBasisCore {
  readonly componnet: Array<IComponent>;
  readonly regex: string;
  readonly context: GlobalContext;

  constructor(context: GlobalContext) {
    this.context = context;
    this.componnet = new Array<IComponent>();
    this.regex = this.context.options.getDefault("binding.regex");
  }
  addSource(sourecName: string, data: any, replace: boolean = true) {
    this.context.addAsSource(sourecName, data, replace);
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
      if (Util.IsNullOrEmpty(this.context.options.DbLibPath)) {
        throw new ClientException(
          `Error in load 'alasql'. 'DbLibPath' Not Configure Properly In Host Object.`
        );
      }
      retVal = await this.getOrLoadObjectAsync(
        "alasql",
        this.context.options.DbLibPath
      );
    } else {
      retVal = alasql;
    }
    return retVal;
  }

  public getOrLoadObjectAsync(object: string, url: string): Promise<any> {
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
  private createCommandComponent(element: Element): CommandComponent {
    const childContainer = container.createChildContainer();
    const core = element.getAttribute("core");
    childContainer.register(Element, { useValue: element });
    childContainer.register("IContext", { useValue: this.context });
    return childContainer.resolve<CommandComponent>(core);
  }
  private extractComponnect(containner: Element) {
    this.ExtratcBasisCommands(containner);
    this.extractBindingComponents(containner);
  }
  private ExtratcBasisCommands(element: Element) {
    const elements = Array.from(element.getElementsByTagName("basis"));
    for (const item of elements) {
      this.componnet.push(this.createCommandComponent(item));
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
