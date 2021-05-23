import IContext from "../../context/IContext";
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
  TestConnectionAsync(context: IContext): Promise<boolean> {
    return Promise.resolve(true);
  }

  // async LoadDataAsync(
  //   context: IContext,
  //   sourceName: string,
  //   parameters: IDictionary<string>
  // ): Promise<IDataSet> {
  //   var retVal = new StreamDataSet(this, context);
  //   await retVal.SendDataAsync(parameters);
  //   return retVal;
  // }

  LoadPageAsync(
    context: IContext,
    pageName: string,
    parameters: IDictionary<string>
  ): Promise<string> {
    throw new Error("WebSocket Call Not Implemented.");
  }
}
