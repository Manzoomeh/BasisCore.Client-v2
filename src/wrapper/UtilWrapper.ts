import cloneDeep from "lodash.clonedeep";
import ISourceWrapper from "./ISourceWrapper";
import IUtilWrapper from "./IUtilWrapper";
import { SourceWrapper } from "./SourceWrapper";

export default class UtilWrapper implements IUtilWrapper {
  readonly source: ISourceWrapper = new SourceWrapper();

  public cloneDeep(obj): any {
    return cloneDeep(obj);
  }

  public getLibAsync(objectName: string, url: string): Promise<any> {
    let retVal: Promise<any> = null;
    if (eval(`typeof(${objectName})`) === "undefined") {
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
}
