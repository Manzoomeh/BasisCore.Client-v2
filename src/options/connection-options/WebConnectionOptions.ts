import IContext from "../../context/IContext";
import IDictionary from "../../IDictionary";
import Util from "../../Util";
import ConnectionOptions from "./ConnectionOptions";

export default class WebConnectionOptions extends ConnectionOptions {
  readonly Url: string;
  readonly Verb: string;
  readonly Heartbeat: string;
  readonly HeartbeatVerb: string;
  constructor(name: string, setting: any) {
    super(name);
    if (typeof setting === "string") {
      this.Url = setting;
    } else {
      this.Url = setting.Connection;
      this.Heartbeat = setting.Heartbeat;
      this.Verb = setting.Verb;
      this.HeartbeatVerb = setting.HeartbeatVerb;
    }
  }
  async TestConnectionAsync(context: IContext): Promise<boolean> {
    var isOk: boolean;
    if (Util.HasValue(this.Heartbeat)) {
      try {
        await WebConnectionOptions.ajax(
          this.Heartbeat,
          this.HeartbeatVerb ??
            context.options.getDefault("source.heartbeatVerb", "get")
        );
        isOk = true;
      } catch {
        isOk = false;
      }
    } else {
      isOk = true;
    }
    return isOk;
  }
  // async LoadDataAsync(
  //   context: IContext,
  //   sourceName: string,
  //   parameters: IDictionary<string> = null
  // ): Promise<IDataSet> {
  //   var rawJson = await Util.Ajax(
  //     this.Url,
  //     this.Verb ?? context.GetDefault("source.verb", "post"),
  //     parameters
  //   );
  //   var json = this.ParseJsonString(rawJson);
  //   return new ConstantDataSet(
  //     json.Tables.map((x) => new ConstantData(x.Key, x.Value))
  //   );
  // }
  async LoadPageAsync(
    context: IContext,
    pageName: string,
    parameters: IDictionary<string>
  ): Promise<string> {
    return await WebConnectionOptions.ajax(
      `${this.Url}${pageName}`,
      this.Verb ?? context.options.getDefault("call.verb"),
      parameters
    );
  }

  private static ajax(
    url: string,
    methode: string,
    parameters: IDictionary<string> = null
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.withCredentials = false;
      xhr.open(methode, url, true);
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.onload = function (e) {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve(xhr.responseText);
          } else {
            reject(xhr.statusText);
          }
        }
      };
      xhr.onerror = function (e) {
        reject(xhr.statusText);
      };
      var encodedDataPairs;
      if (Util.HasValue(parameters)) {
        encodedDataPairs = [];
        ///https://developer.mozilla.org/en-US/docs/Web/Guide/AJAX/Getting_Started
        Object.getOwnPropertyNames(parameters).forEach((name, _i, _) =>
          encodedDataPairs.push(
            encodeURIComponent(name) +
              "=" +
              encodeURIComponent(parameters[name])
          )
        );
        encodedDataPairs = encodedDataPairs.join("&").replace(/%20/g, "+");
      }
      xhr.send(encodedDataPairs);
    });
  }
}
