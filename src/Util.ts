import IDictionary from "./IDictionary";

export default class Util {
  static parser: DOMParser = new DOMParser();
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

  static getDataAsync<T>(url: string): Promise<T> {
    return Util.fetchDataAsync(url, "GET");
  }

  static async fetchDataAsync<T>(
    url: string,
    method: "POST" | "GET",
    data?: any
  ): Promise<T> {
    const init: RequestInit = { method: method };
    if (data) {
      init.headers = {
        "Content-Type": "application/json",
      };
      init.body = JSON.stringify(data);
    }
    const result = await fetch(url, init);
    return await result.json();
  }

  static formatString(
    pattern: string,
    params: IDictionary<string> | any
  ): string {
    const paraNameList = [...Object.getOwnPropertyNames(params)];
    const formatter = new Function(...paraNameList, `return \`${pattern}\``);
    return formatter(...paraNameList.map((x) => Reflect.get(params, x)));
  }

  static formatUrl(
    url: string,
    paramsObject?: IDictionary<string> | any,
    queryStringObject?: IDictionary<string> | any
  ): string {
    let retVal = paramsObject ? Util.formatString(url, paramsObject) : url;
    if (queryStringObject) {
      const queryPartList = Object.getOwnPropertyNames(queryStringObject).map(
        (x) =>
          `${encodeURIComponent(x)}=${encodeURIComponent(
            Reflect.get(queryStringObject, x)
          )}`
      );
      retVal = `${retVal}?${queryPartList.join("&")}`;
    }
    return retVal;
  }

  static parse(template: string): Document {
    return Util.parser.parseFromString(template, "text/html");
  }

  public static Move(oldParent: Node, newParent: Node) {
    while (oldParent.childNodes.length > 0) {
      newParent.appendChild(oldParent.childNodes[0]);
    }
  }
}
