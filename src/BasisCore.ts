import ClientException from "./exception/ClientException";
import IBasisCore from "./IBasisCore";
import Util from "./Util";
import { singleton } from "tsyringe";
import GlobalContext from "./context/GlobalContext";
import GroupComponent from "./component/collection/GroupComponent";

declare var alasql: any;

@singleton()
export default class BasisCore implements IBasisCore {
  readonly context: GlobalContext;
  private content: GroupComponent;

  constructor(context: GlobalContext) {
    this.context = context;
  }
  addSource(sourecName: string, data: any, replace: boolean = true) {
    this.context.addAsSource(sourecName, data, replace);
  }

  setArea(selector: string): void;
  setArea(element?: Element): void;
  setArea(param?: any): void {
    var element: Element;
    if (typeof param === "string") {
      element = document.querySelector(param);
    } else if (param instanceof Element) {
      element = param;
    } else {
      throw new ClientException("Invalid Argument");
    }
    this.content = new GroupComponent(element, this.context);
    this.content.runAsync();
  }

  async getOrLoadDbLibAsync(): Promise<any> {
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
}
