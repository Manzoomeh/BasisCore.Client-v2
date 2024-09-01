import IContext from "../../context/IContext";
import Data from "../../data/Data";
import { EventHandlerWithReturn } from "../../event/EventHandlerWithReturn";
import IDictionary from "../../IDictionary";
import ConnectionOptions from "./ConnectionOptions";
import StreamPromise from "./StreamPromise";

enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  OPTIONS = "OPTIONS",
  HEAD = "HEAD",
}
export default class ChunkBasedConnectionOptions extends ConnectionOptions {
  readonly url: string;
  readonly maxRetry: number = 5;
  readonly method: HttpMethod;
  readonly body : NodeJS.Dict<any>
  readonly activeFetch: Map<string, ReadableStreamDefaultReader> = new Map<
    string,
    ReadableStreamDefaultReader
  >();
  constructor(name: string, setting: any) {
    super(name);
    if (typeof setting === "string") {
      this.url = setting;
      this.method = HttpMethod.GET;
    } else {
      this.url = setting.Connection;
      this.method = setting.method;
      this.body = setting.body
    }
  }

  public loadDataAsync(
    context: IContext,
    sourceId: string,
    parameters: IDictionary<string>,
    onDataReceived: EventHandlerWithReturn<Array<Data>, boolean>
  ): Promise<void> {
    const url = this.url;
    const method = this.method;
    const body = this.body
    const activeFetch = this.activeFetch;
    const extractNextJSON = (str, start = 0) => {
      let firstOpen, firstClose, candidate;
      firstOpen = str.indexOf("{", start);
      firstClose = str.lastIndexOf("}");
      if (firstClose <= firstOpen) {
        return null;
      }
      do {
        candidate = str.substring(firstOpen, firstClose + 1);
        try {
          var res = JSON.parse(candidate);
          return [res, firstClose + 1];
        } catch (e) {}
        firstClose = str.substr(0, firstClose).lastIndexOf("}");
      } while (firstClose > firstOpen);
    };
    return new StreamPromise<void>(
      this.Name,
      (resolve, reject) => {
        let retry = 0;
        async function initAndConnect(reconnect: boolean) {
          retry++;
          const init: RequestInit = {
            method: method,
          };
          if (method != "GET") {
            init.body = body ? JSON.stringify(body) : parameters ? JSON.stringify(parameters) : null;
            init.headers = {
              "Content-Type": "application/json",
            };
          }
          const request = new Request(url, init);
          let response = await fetch(request);
          console.log("%s %s", url, reconnect ? "Reconnected" : "Connected");
          const reader = response.body.getReader();
          activeFetch.set(sourceId, reader);
          const decoder = new TextDecoder();
          let done = false;
          let remain = "";
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              remain += decoder.decode(value, { stream: true });
              let lastEndFrom = 0;
              let startFrom = 0;
              let extractResult = null;
              do {
                startFrom = lastEndFrom;
                extractResult = extractNextJSON(remain, startFrom);
                if (extractResult) {
                  var json = extractResult[0];
                  lastEndFrom = extractResult[1];
                  if (
                    json &&
                    json.setting &&
                    json.setting.keepalive !== undefined &&
                    !json.setting.keepalive
                  ) {
                    context.logger.logInformation(
                      "Disconnect from %s by server request",
                      url
                    );
                    done = true;
                  }
                  if (json && json.sources) {
                    const dataList = json?.sources.map(
                      (x) => new Data(x.options.tableName, x.data, x.options)
                    );
                    if (dataList.length > 0) {
                      const receiverIsOk = onDataReceived(dataList);
                      if (!receiverIsOk) {
                        context.logger.logInformation(
                          "Disconnect from %s by receiver request. maybe disposed!",
                          url
                        );
                        done = true;
                      }
                    }
                  }
                }
              } while (extractResult);
              remain = remain.substring(startFrom);
            }
          }
          activeFetch.delete(sourceId);
          resolve();
          context.logger.logInformation(`${url} Disconnected`);
        }
        initAndConnect(false);
      },
      //@ts-ignore
      () => this.activeFetch.get(sourceId) ?? null
    );
  }

  TestConnectionAsync(context: IContext): Promise<boolean> {
    return Promise.resolve(true);
  }

  loadPageAsync(
    context: IContext,
    pageName: string,
    parameters: IDictionary<string>
  ): Promise<string> {
    throw new Error("WebSocket call not implemented.");
  }
}
