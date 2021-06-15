import IContext from "../../context/IContext";
import Data from "../../data/Data";
import { MergeType } from "../../enum";
import { EventHandler } from "../../event/EventHandler";
import IDictionary from "../../IDictionary";
import ConnectionOptions from "./ConnectionOptions";

export default class WebSocketConnectionOptions extends ConnectionOptions {
  readonly url: string;
  readonly activeSockets: Map<string, WebSocket> = new Map<string, WebSocket>();

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
    onDataReceived: EventHandler<Array<Data>>
  ): Promise<void> {
    const url = this.url;
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

    return new Promise((resolve, reject) => {
      function initAndConnect(reconnect: boolean) {
        const socket = new WebSocket(url);
        let error = null;
        socket.onopen = (e) => {
          activeSockets.set(sourceId, socket);
          context.logger.logInformation(
            "%s %s",
            url,
            reconnect ? "Reconnected" : "Connected"
          );
          socket.send(JSON.stringify(parameters));
        };
        socket.onclose = (e) => {
          activeSockets.delete(sourceId);
          if (error != null) {
            context.logger.logInformation("Try reconnect To %s", url);
            initAndConnect(true);
            error = null;
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
            var json: IServerResponse = JSON.parse(e.data);
            if (json.setting && !json.setting.keepalive) {
              context.logger.logInformation(
                "Disconnect from %s by server request",
                url
              );
              socket.close();
            }
            if (json.sources) {
              const dataList = Object.keys(json?.sources)
                .map((key) => {
                  return {
                    key: key,
                    data: json.sources[key],
                  };
                })
                .map((x) => new Data(x.key, x.data.data, x.data.mergeType));
              if (dataList.length > 0) {
                onDataReceived(dataList);
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
    });
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
interface IServerResponseSetting {
  keepalive: boolean;
}
interface IServerResponse {
  setting: IServerResponseSetting;
  sources: IDictionary<IServerData<any>>;
}
interface IServerData<T> {
  data: Array<T>;
  mergeType: MergeType;
}

// class SocketSession{
//   public readonly task:Promise<void>
// }
