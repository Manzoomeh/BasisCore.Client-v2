import IContext from "../../context/IContext";
import Data from "../../data/Data";
import { EventHandlerWithReturn } from "../../event/EventHandlerWithReturn";
import EventManager from "../../event/EventManager";
import IDictionary from "../../IDictionary";
import { HttpMethod, IServerResponse } from "../../type-alias";
import IBCUtil from "../../wrapper/IBCUtil";
import ConnectionOptions from "./ConnectionOptions";

declare const $bc: IBCUtil;

export class PushConnectionOptions extends ConnectionOptions {
  private readonly _key: string;
  private readonly manager: EventManager<Data[]>;
  constructor(name: string, setting: any) {
    super(name);
    this._key = setting;
    this.manager = new EventManager<Data[]>();
    $bc.util.addMessageHandler(this._key, this.processMessage.bind(this));
  }

  private processMessage(message: IServerResponse<any>) {
    console.log("push message receive", message);
    if (message?.sources) {
      const dataList = message.sources.map(
        (x) =>
          new Data(x.options?.tableName ?? "cms.no-name", x.data, x.options)
      );
      this.manager.Trigger(dataList);
    }
  }

  public TestConnectionAsync(context: IContext): Promise<boolean> {
    throw new Error("TestConnection not support in PushConnectionOptions.");
  }

  public loadDataAsync(
    context: IContext,
    sourceId: string,
    parameters: IDictionary<string>,
    onDataReceived: EventHandlerWithReturn<Data[], boolean>
  ): Promise<void> {
    this.manager.Add(onDataReceived);
    return Promise.resolve();
  }

  public loadPageAsync(
    context: IContext,
    pageName: string,
    parameters: IDictionary<string>,
    method?: HttpMethod
  ): Promise<string> {
    throw new Error("loadPage not support in PushConnectionOptions.");
  }
}
