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

type IBasedConnectionOptions = {
  Connection: string;
  method?: HttpMethod;
  body?: NodeJS.Dict<any>;
  bodyFactory?:
    | string
    | ((
        context: IContext,
        sourceId: string,
        parameters: IDictionary<string>
      ) => NodeJS.Dict<any>);
  onClose?:
    | string
    | ((param: { withError: boolean; context: IContext }) => void);
};
export default class ChunkBasedConnectionOptions extends ConnectionOptions {
  readonly url: string;
  readonly maxRetry: number = 5;
  readonly method: HttpMethod;
  readonly body: NodeJS.Dict<any>;
  readonly bodyFactory?:
    | string
    | ((
        context: IContext,
        sourceId: string,
        parameters: IDictionary<string>
      ) => NodeJS.Dict<any>);
  readonly onClose?:
    | string
    | ((param: { withError: boolean; context: IContext }) => void);
  readonly activeFetch: Map<string, ReadableStreamDefaultReader> = new Map<
    string,
    ReadableStreamDefaultReader
  >();
  constructor(name: string, setting: IBasedConnectionOptions | string) {
    super(name);
    if (typeof setting === "string") {
      this.url = setting;
      this.method = HttpMethod.GET;
    } else {
      this.url = setting.Connection;
      this.method = setting.method ?? HttpMethod.GET;
      this.body = setting.body;
      this.bodyFactory = setting.bodyFactory;
      this.onClose = setting.onClose;
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
    const thisBody = this.body;
    const thisBodyFactory = this.bodyFactory;
    const activeFetch = this.activeFetch;
    const extractNextJSON = (source: string, validMinPosition: number) => {
      let firstOpen = source.indexOf("{");
      let lastClose = source.lastIndexOf("}");
      while (lastClose > firstOpen && lastClose >= validMinPosition) {
        let candidate = source.substring(firstOpen, lastClose + 1);
        try {
          var jsonObj = JSON.parse("[" + candidate + "]");
          return [jsonObj, lastClose + 1];
        } catch (e) {
          if (e instanceof SyntaxError) {
          } else {
            console.error(e);
          }
        }
        lastClose = source.substring(0, lastClose).lastIndexOf("}");
      }
      return null;
    };
    return new StreamPromise<void>(
      this.Name,
      (resolve, reject) => {
        let retry = 0;
        const thisOnClose = this.onClose;
        async function initAndConnect(reconnect: boolean) {
          retry++;
          const init: RequestInit = {
            method: method,
          };
          if (method != "GET") {
            let body = thisBody;
            if (thisBodyFactory) {
              const bodyFactoryFn: (
                context: IContext,
                sourceId: string,
                parameters: IDictionary<string>
              ) => NodeJS.Dict<any> =
                typeof thisBodyFactory === "string"
                  ? eval(thisBodyFactory)
                  : thisBodyFactory;
              body = bodyFactoryFn(context, sourceId, parameters);
            }
            init.body = body
              ? JSON.stringify(body)
              : parameters
              ? JSON.stringify(parameters)
              : null;
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
            try {
              done = doneReading;
              if (value || done) {
                let minValidPosition = value
                  ? remain.length
                  : remain.length - 50;
                remain += value ? decoder.decode(value, { stream: true }) : "";
                let startFrom = 0;
                let extractResult = null;
                extractResult = extractNextJSON(remain, minValidPosition);
                if (extractResult) {
                  const jsonItems: IServerResponse<any>[] = extractResult[0];
                  startFrom = extractResult[1];
                  minValidPosition -= startFrom;
                  if (minValidPosition < 0) {
                    minValidPosition = 0;
                  }
                  remain = remain.substring(startFrom);
                  jsonItems.forEach((json) => {
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
                      const dataList: Data[] = json?.sources.map(
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
                  });
                }
              }
            } catch (ex) {
              console.error(ex);
            }
          }
          let hasError = false;
          if (remain.length > 0 && remain != ",null]") {
            console.error("Invalid remain part of json", remain);
            hasError = true;
          } else {
            console.log("End of chunked data...");
          }
          activeFetch.delete(sourceId);
          resolve();
          context.logger.logInformation(`${url} Disconnected`);
          if (thisOnClose) {
            const onCloseFn: (param: {
              withError: boolean;
              context: IContext;
            }) => void =
              typeof thisOnClose === "string" ? eval(thisOnClose) : thisOnClose;
            onCloseFn({
              withError: hasError,
              context: context,
            });
          }
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
