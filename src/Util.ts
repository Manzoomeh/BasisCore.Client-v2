import IBasisCore from "./IBasisCore";
import IData from "./data/IData";

declare let $bc: IBasisCore;

export default class Util {
  public static HasValue(data: any): boolean {
    return data !== undefined && data != null;
  }

  public static isEqual(stringA: string, stringB: string): boolean {
    return (stringA || "").isEqual(stringB);
  }

  public static Equal(a: any, b: any): boolean {
    var retVal: boolean = true;
    if (!Util.HasValue(a) || !Util.HasValue(b)) {
      retVal = false;
    } else {
      var aProps = Object.getOwnPropertyNames(a);
      var bProps = Object.getOwnPropertyNames(b);
      if (aProps.length != bProps.length) {
        retVal = false;
      } else {
        for (var i = 0; i < aProps.length; i++) {
          var propName = aProps[i];
          if (a[propName] !== b[propName]) {
            retVal = false;
            break;
          }
        }
      }
    }
    return retVal;
  }

  public static ReplaceEx(
    source: string,
    searchValue: string,
    replaceValue: string
  ): string {
    return source.replace(new RegExp(searchValue, "gi"), replaceValue);
  }

  public static IsNullOrEmpty(data: string): boolean {
    return data === undefined || data == null || data === "";
  }

  static async ApplyFilterAsync(source: IData, filter: string): Promise<any[]> {
    var retVal: any[];
    if (Util.IsNullOrEmpty(filter)) {
      retVal = source.Rows;
    } else {
      var lib = await $bc.getOrLoadDbLibAsync();
      retVal = lib(`SELECT * FROM ? where ${filter}`, [source.Rows]);
    }
    return retVal;
  }

  public static findElementRootCommandNode(rootElement: Node): Array<Element> {
    var retVal: Array<Element> = [];
    var prodcess = (child: ChildNode) => {
      if (child instanceof Element && (<Element>child).isBasisCore()) {
        retVal.push(<any>child);
      } else {
        child.childNodes.forEach(prodcess);
      }
    };
    rootElement.childNodes.forEach(prodcess);
    return retVal;
  }
}