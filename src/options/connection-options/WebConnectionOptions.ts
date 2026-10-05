import IContext from "../../context/IContext";
import Data from "../../data/Data";
import { EventHandler } from "../../event/EventHandler";
import IDictionary from "../../IDictionary";
import {
  ConnectionSetting,
  HttpMethod,
  IServerResponse,
  SourceId,
} from "../../type-alias";
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
        await WebConnectionOptions.xmlAjax(
          this.Heartbeat,
          this.HeartbeatVerb ??
            context.options.getDefault<HttpMethod>("source.heartbeatverb")
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
    var rawJson = await WebConnectionOptions.fetchAjax(
      this.Url,
      this.Verb ?? context.options.getDefault<HttpMethod>("source.verb"),
      parameters
    );
    const json = <IServerResponse<any>>JSON.parse(rawJson);
    onDataReceived(
      json.sources.map((x) => new Data(x.options.tableName, x.data, x.options))
    );
  }

  async loadPageAsync(
    context: IContext,
    pageName: string,
    parameters: IDictionary<string>,
    method?: HttpMethod
  ): Promise<string> {
    return await WebConnectionOptions.xmlAjax(
      `${this.Url}${pageName ?? ""}`,
      method ?? this.Verb ?? context.options.getDefault("call.verb"),
      parameters
    );
  }

  private static xmlAjax(
    url: string,
    method: HttpMethod,
    parameters: IDictionary<string> = null
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let requestUrl = url;
      let body: string | null = null;
      const httpMethod = method.toUpperCase();

      if (Util.HasValue(parameters)) {
        const params = new URLSearchParams();

        Object.entries(parameters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, String(value));
          }
        });

        const query = params.toString();

        if (httpMethod === "GET") {
          //TODO:not work on send command send as query string. must edit
          // if (query) {
          //   const separator = requestUrl.includes("?") ? "&" : "?";
          //   requestUrl += `${separator}${query}`;
          // }
        } else if (["POST", "PUT", "PATCH"].includes(httpMethod)) {
          body = query;
        }
      }

      const xhr = new XMLHttpRequest();
      xhr.open(httpMethod, requestUrl, true);
      xhr.timeout = 15000;

      if (httpMethod !== "GET") {
        xhr.setRequestHeader(
          "Content-Type",
          "application/x-www-form-urlencoded"
        );
      }

      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(
              new Error(`HTTP ${xhr.status}: ${xhr.responseText || "Error"}`)
            );
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.ontimeout = () => reject(new Error("Request timeout"));

      xhr.send(body);
    });
  }

  private static async fetchAjax(
    url: string,
    method: HttpMethod,
    parameters: IDictionary<string> = null
  ): Promise<string> {
    let requestUrl = url;
    const httpMethod = method.toUpperCase();
    const headers = new Headers();
    let body: URLSearchParams | null = null;

    if (Util.HasValue(parameters)) {
      const params = new URLSearchParams();
      Object.entries(parameters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, String(value));
        }
      });

      if (httpMethod === "GET") {
        const separator = requestUrl.includes("?") ? "&" : "?";
        requestUrl += `${separator}${params.toString()}`;
      } else {
        body = params;
        headers.set("Content-Type", "application/x-www-form-urlencoded");
      }
    }

    const response = await fetch(requestUrl, {
      method: httpMethod,
      headers,
      body,
      credentials: "omit",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.text();
  }
}
