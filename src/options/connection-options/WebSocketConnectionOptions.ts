import IContext from "../../context/IContext";
import Data from "../../data/Data";
import { EventHandlerWithReturn } from "../../event/EventHandlerWithReturn";
import IDictionary from "../../IDictionary";
import { IServerResponse } from "../../type-alias";
import ConnectionOptions from "./ConnectionOptions";
import StreamPromise from "./StreamPromise";

export default class WebSocketConnectionOptions extends ConnectionOptions {
  readonly url: string;
  readonly activeSockets: Map<string, WebSocket> = new Map<string, WebSocket>();
  readonly maxRetry: number = 5;

  constructor(name: string, setting: any) {
    super(name);
    if (typeof setting === "string") {
      this.url = setting;
    } else {
      this.url = setting.Connection;
    }
  }

  public loadDataAsync(
    context: IContext,
    sourceId: string,
    parameters: IDictionary<string>,
    onDataReceived: EventHandlerWithReturn<Array<Data>, boolean>
  ): Promise<void> {
    const url = this.url;
    const maxRetry = this.maxRetry;
    const activeSockets = this.activeSockets;
    const preOpenSocket = activeSockets.get(sourceId);
    if (preOpenSocket) {
      preOpenSocket.close();
      context.logger.logInformation(
        "Disconnect from %s by client request",
        url
      );
      activeSockets.delete(sourceId);
    }

    return new StreamPromise<void>(
      this.Name,
      (resolve, reject) => {
        let retry = 0;
        function initAndConnect(reconnect: boolean) {
          retry++;
          const socket = new WebSocket(url);
          let error = null;
          socket.onopen = (e) => {
            activeSockets.set(sourceId, socket);
            console.log("%s %s", url, reconnect ? "Reconnected" : "Connected");
            socket.send(JSON.stringify(parameters));
          };
          socket.onclose = (e) => {
            activeSockets.delete(sourceId);
            if (error != null) {
              context.logger.logInformation("Try reconnect To %s", url);
              if (retry < maxRetry) {
                initAndConnect(true);
                error = null;
              } else {
                reject(error);
              }
            } else {
              resolve();
              context.logger.logInformation(`${url} Disconnected`);
            }
          };
          socket.onerror = (e) => {
            context.logger.logError(`Error On '${url}'`, <any>e);
            error = e;
          };
          socket.onmessage = (e) => {
            try {
              var json: IServerResponse<any> = JSON.parse(e.data);
              if (
                json.setting &&
                json.setting.keepalive !== undefined &&
                !json.setting.keepalive
              ) {
                context.logger.logInformation(
                  "Disconnect from %s by server request",
                  url
                );
                socket.close();
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
                    socket.close();
                  }
                }
              }
            } catch (ex) {
              context.logger.logError(
                "Error in process WebSocket received message",
                ex
              );
            }
          };
        }
        initAndConnect(false);
      },
      () => this.activeSockets.get(sourceId) ?? null
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
