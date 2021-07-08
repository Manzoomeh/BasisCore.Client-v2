import cloneDeep from "lodash.clonedeep";
import ISourceWrapper from "./ISourceWrapper";
import IUtilWrapper from "./IUtilWrapper";
import { SourceWrapper } from "./SourceWrapper";
import defaultsDeep from "lodash.defaultsdeep";
import IContext from "../context/IContext";
import ClientException from "../exception/ClientException";

export default class UtilWrapper implements IUtilWrapper {
  readonly source: ISourceWrapper = new SourceWrapper();

  public cloneDeep<T>(obj: T): T {
    return cloneDeep(obj);
  }

  public getLibAsync(objectName: string, url: string): Promise<any> {
    let retVal: Promise<any> = null;
    let type = "undefined";
    try {
      type = eval(`typeof(${objectName})`);
    } catch (e) {
      /*Nothing*/
    }
    if (type === "undefined") {
      retVal = new Promise((resolve, reject) => {
        let script = document.querySelector<HTMLScriptElement>(
          `script[src='${url}']`
        );
        if (!script) {
          script = document.createElement("script");
          script.setAttribute("type", "text/javascript");
          script.setAttribute("src", url);
          document.getElementsByTagName("head")[0].appendChild(script);
        }
        const loadListener = (_) => {
          script.removeEventListener("load", loadListener);
          script.removeEventListener("error", errorListener);
          console.log("%s loaded from %s", objectName, url);
          resolve(eval(objectName));
        };
        const errorListener = (error) => {
          script.removeEventListener("load", loadListener);
          script.removeEventListener("error", errorListener);
          reject(error);
        };
        script.addEventListener("load", loadListener);
        script.addEventListener("error", errorListener);
      });
    } else {
      return Promise.resolve(eval(objectName));
    }
    return retVal;
  }

  public defaultsDeep<T>(data: Partial<T>, defaults: Partial<T>): T {
    return defaultsDeep(this.cloneDeep(data), defaults);
  }

  public toNode(rawHtml: string): Node {
    return document.createRange().createContextualFragment(rawHtml);
  }

  public async getComponentAsync(context: IContext, key: string): Promise<any> {
    let retVal: any;
    if (key) {
      if (key.indexOf("local.") == 0) {
        const lib = key.slice(key.indexOf(".") + 1);
        retVal = eval(lib);
        console.log("%s loaded from local", lib);
      } else {
        let tmpKey = key;
        while (true) {
          const url = context.options.repositories[tmpKey];
          if (url) {
            retVal = await this.getLibAsync(key, url);
            break;
          } else {
            const lastDotIndex = tmpKey.lastIndexOf(".");
            if (lastDotIndex == -1) {
              break;
            }
            tmpKey = tmpKey.slice(0, lastDotIndex);
          }
        }
      }
    }
    if (retVal) {
      return retVal;
    }
    throw new ClientException(`'${key}' related repository setting not found`);
  }
}
