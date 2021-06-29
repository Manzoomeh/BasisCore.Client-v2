import IContext from "../../context/IContext";
import Data from "../../data/Data";
import { EventHandler } from "../../event/EventHandler";
import ClientException from "../../exception/ClientException";
import IDictionary from "../../IDictionary";
import { HttpMethod } from "../../type-alias";
import UrlBaseConnectionOptions from "./UrlBaseConnectionOptions";

export default class RESTConnectionOptions extends UrlBaseConnectionOptions {
  constructor(name: string, setting: any) {
    super(name, setting);
  }

  TestConnectionAsync(context: IContext): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  public loadDataAsync(
    context: IContext,
    sourceId: string,
    parameters: IDictionary<string>,
    onDataReceived: EventHandler<Data[]>
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public loadPageAsync(
    context: IContext,
    pageName: string,
    parameters: IDictionary<string>,
    method?: HttpMethod
  ): Promise<string> {
    throw new ClientException(
      "LoadPageAsync Method not Supported In REST API Provider."
    );
  }
}
