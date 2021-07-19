import IContext from "../../context/IContext";
import Data from "../../data/Data";
import { EventHandler } from "../../event/EventHandler";
import IDictionary from "../../IDictionary";
import { ConnectionSetting, HttpMethod, SourceId } from "../../type-alias";
import Util from "../../Util";
import UrlBaseConnectionOptions from "./UrlBaseConnectionOptions";

export default class WebConnectionOptions extends UrlBaseConnectionOptions {
  constructor(name: string, setting: ConnectionSetting) {
    super(name, setting);
  }

  async TestConnectionAsync(context: IContext): Promise<boolean> {
    var isOk: boolean;
    if (Util.HasValue(this.Heartbeat)) {
      try {
        await WebConnectionOptions.ajax(
          this.Heartbeat,
          this.HeartbeatVerb ??
            context.options.getDefault<HttpMethod>("source.heartbeatVerb")
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

  public async loadDataAsync(
    context: IContext,
    sourceId: SourceId,
    parameters: IDictionary<string>,
    onDataReceived: EventHandler<Array<Data>>
  ): Promise<void> {
    var rawJson = await WebConnectionOptions.ajax(
      this.Url,
      this.Verb ?? context.options.getDefault<HttpMethod>("source.verb"),
      parameters
    );
    var json = this.ParseJsonString(rawJson);
    onDataReceived(json.Tables.map((x) => new Data(x.Key, x.Value)));
  }

  async loadPageAsync(
    context: IContext,
    pageName: string,
    parameters: IDictionary<string>,
    method?: HttpMethod
  ): Promise<string> {
    return await WebConnectionOptions.ajax(
      `${this.Url}${pageName}`,
      method ?? this.Verb ?? context.options.getDefault("call.verb"),
      parameters
    );
  }

  private static ajax(
    url: string,
    method: HttpMethod,
    parameters: IDictionary<string> = null
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.withCredentials = false;
      xhr.open(method, url, true);
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
