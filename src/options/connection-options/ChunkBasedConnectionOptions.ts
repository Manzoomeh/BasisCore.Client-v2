import IContext from "../../context/IContext";
import Data from "../../data/Data";
import { EventHandlerWithReturn } from "../../event/EventHandlerWithReturn";
import IDictionary from "../../IDictionary";
import { IServerResponse } from "../../type-alias";
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
  readonly activeFetch: Map<string, ReadableStreamDefaultReader> = new Map<string, ReadableStreamDefaultReader>();
  constructor(name: string, setting: any) {
    super(name);
    if (typeof setting === "string") {
      this.url = setting;
      this.method = HttpMethod.GET;
    } else {
      this.url = setting.Connection;
      this.method = setting.method;
    }
  }
  public loadDataAsync(
    context: IContext,
    sourceId: string,
    parameters: IDictionary<string>,
    onDataReceived: EventHandlerWithReturn<Array<Data>, boolean>
  ): Promise<void> {
    const url = this.url;
    const method = this.method
    const activeFetch = this.activeFetch;
    return new StreamPromise<void>(
      this.Name,
      (resolve, reject) => {
        let retry = 0;
        async function initAndConnect(reconnect: boolean) {
          retry++;
          const init: RequestInit = {
            method: method,
          };
          if(method!="GET"){
              init.body = parameters ? JSON.stringify(parameters) : null;
          }
          const request = new Request(url, init);
          let response = await fetch(request);
          console.log("%s %s", url, reconnect ? "Reconnected" : "Connected");
          const reader = response.body.getReader();
          activeFetch.set(sourceId, reader);
          const decoder = new TextDecoder();
          let done = false;
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              try {
                const json : IServerResponse<any> = JSON.parse(
                  decoder.decode(value, { stream: true })
                );
                if (
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
                if (json.sources) {
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
              } catch (ex) {
                reject(ex);
                context.logger.logError(
                  "Error in process chunk based request",
                  ex
                );
              }
            }
          }
          activeFetch.delete(sourceId);
          resolve();
          context.logger.logInformation(`${url} Disconnected`);
        }
        initAndConnect(false);
      },
      //@ts-ignore
      () =>this.activeFetch.get(sourceId) ?? null
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
