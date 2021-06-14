import IBasisCore from "../../IBasisCore";
import IContext from "../../context/IContext";
import ClientException from "../../exception/ClientException";
import IDictionary from "../../IDictionary";
import ConnectionOptions from "./ConnectionOptions";
import DataSet from "../../data/DataSet";
import { EventHandler } from "../../event/EventHandler";

declare let $bc: IBasisCore;

export default class LocalStorageConnectionOptions extends ConnectionOptions {
  readonly Url: string;
  readonly FunctionName: string;
  readonly context: IContext;
  private Function: (
    parameters: IDictionary<string>
  ) => Promise<IDictionary<any[]>>;

  constructor(name: string, setting: any, context: IContext) {
    super(name);
    this.context = context;
    if (typeof setting === "string") {
      var parts = setting.split("|");
      this.Url = parts[0];
      if (parts.length != 2) {
        throw new ClientException(
          `For Local Storage Connection '${name}', Setting In Not Valid`
        );
      }
      this.FunctionName = parts[1];
    } else {
      this.Url = setting.Url;
      this.FunctionName = setting.Function;
    }
    this.Function = null;
  }

  private async LoadLibAsync() {
    if (!this.Function) {
      this.Function = await this.context.getOrLoadObjectAsync(
        this.FunctionName,
        this.Url
      );
    }
  }
  async TestConnectionAsync(context: IContext): Promise<boolean> {
    await this.LoadLibAsync();
    return this.FunctionName !== null;
  }

  public loadDataAsync(
    context: IContext,
    sourceId: string,
    parameters: IDictionary<string>,
    onDataReceived: EventHandler<DataSet>
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public loadPageAsync(
    context: IContext,
    pageName: string,
    parameters: IDictionary<string>
  ): Promise<string> {
    throw new ClientException(
      "LoadPageAsync Method not Supported In LocalStorage Provider."
    );
  }
}
