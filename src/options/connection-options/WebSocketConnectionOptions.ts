import IContext from "../../context/IContext";
import Data from "../../data/Data";
import DataSet from "../../data/DataSet";
import { EventHandler } from "../../event/EventHandler";
import IDictionary from "../../IDictionary";
import ConnectionOptions from "./ConnectionOptions";

export default class WebSocketConnectionOptions extends ConnectionOptions {
  readonly Url: string;
  constructor(name: string, setting: any) {
    super(name);
    if (typeof setting === "string") {
      this.Url = setting;
    } else {
      this.Url = setting.Connection;
    }
  }

  public loadDataAsync(
    context: IContext,
    sourceId: string,
    parameters: IDictionary<string>,
    onDataReceived: EventHandler<DataSet>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.Url);
      let error = null;
      let reconnect = false;
      socket.onopen = (e) =>
        context.logger.logInformation(
          `${this.Url} ${reconnect ? "RE" : ""}CONNECTED`
        );
      socket.onclose = (e) => {
        if (error != null) {
          console.log(`Try Reconnect To '${this.Url}'`);
          //this.InitWebSocket(true);
          error = null;
        } else {
          resolve();
          context.logger.logInformation(`${this.Url} DISCONNECTED`);
        }
      };
      socket.onerror = (e) => {
        console.log(`Error On '${this.Url}'`);
        context.logger.logError(`Error On '${this.Url}'`, <any>e);
        error = e;
      };
      socket.onmessage = (e) => {
        try {
          var json = JSON.parse(e.data);

          const dataList = Object.keys(json)
            .map((key) => {
              return {
                key: key,
                info: json[key]?.info,
                data: json[key].data,
              };
            })
            .map((x) => new Data(x.key, x.data));
          onDataReceived(new DataSet(dataList));
        } catch (ex) {
          context.logger.logError(
            "Error In Call WebSocketConnection::ProcessMessage",
            ex
          );
        }
      };
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
    throw new Error("WebSocket Call Not Implemented.");
  }
}
