import IContext from "../../context/IContext";
import DataSet from "../../data/DataSet";
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
    parameters: IDictionary<string>
  ): Promise<DataSet> {
    throw new Error("Method not implemented.");
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
