import IContext from "../../context/IContext";
import Data from "../../data/Data";
import { EventHandlerWithReturn } from "../../event/EventHandlerWithReturn";
import IDictionary from "../../IDictionary";
import ConnectionOptions from "./ConnectionOptions";
import StreamPromise from "./StreamPromise";
//@ts-ignore
import pako from "pako";

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
  readonly gzipMode: "none" | "full" | "perchunk";
  readonly isFinalValueCanParsed: boolean;
  readonly maxRetry: number = 5;
  readonly method: HttpMethod;
  readonly activeFetch: Map<string, ReadableStreamDefaultReader> = new Map<
    string,
    ReadableStreamDefaultReader
  >();
  constructor(name: string, setting: any) {
    super(name);
    if (typeof setting === "string") {
      this.url = setting;
      this.method = HttpMethod.GET;
      this.gzipMode = "none";
      this.isFinalValueCanParsed = false;
    } else {
      this.url = setting.Connection;
      this.method = setting.method;
      this.gzipMode = setting.gzipMode;
      this.isFinalValueCanParsed = setting.isFinalValueCanParsed;
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
    const activeFetch = this.activeFetch;
    const gzipMode = this.gzipMode;
    const isFinalValueCanParsed = this.isFinalValueCanParsed;
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
            init.body = parameters ? JSON.stringify(parameters) : null;
          }
          if (gzipMode == "full") {
            throw new Error("gzip mode per chunk are not supported");
          }
          if (isFinalValueCanParsed && gzipMode == "perchunk") {
            throw new Error(
              "final value cannot be parsed in perchunk gzip mode"
            );
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
                let json;
                let decodedStr;
                if (gzipMode == "perchunk") {
                  decodedStr = pako.ungzip(value, { to: "string" });
                } else {
                  if (isFinalValueCanParsed) {
                    decodedStr = decoder
                      .decode(value, { stream: true })
                      .slice(0, -1);
                  } else {
                    decodedStr = decoder.decode(value, { stream: true });
                  }
                }
                try {
                  json = JSON.parse(decodedStr);
                } catch (err) {
                  if (
                    isFinalValueCanParsed &&
                    decodedStr != ",null]" &&
                    decodedStr != "[null"
                  ) {
                    throw new Error("invalid json");
                  }
                }
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
