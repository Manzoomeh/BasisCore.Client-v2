import Data from "../data/Data";
import { EventHandlerWithReturn } from "../event/EventHandlerWithReturn";
import ClientException from "../exception/ClientException";
import IDictionary from "../IDictionary";
import ILogger from "../logger/ILogger";
import ConnectionOptionsManager from "../options/connection-options/ConnectionOptionsManager";
import WebConnectionOptions from "../options/connection-options/WebConnectionOptions";
import { HostOptions } from "../options/HostOptions";
import IContextRepository from "../repository/IContextRepository";
import { HttpMethod, SourceId } from "../type-alias";
import Util from "../Util";
import IBCUtil from "../wrapper/IBCUtil";
import Context from "./Context";

declare var alasql: any;
declare const $bc: IBCUtil;

export default abstract class RootContext extends Context {
  readonly connections: ConnectionOptionsManager;
  readonly loadLibDic: IDictionary<Promise<any>> = {};
  constructor(
    repository: IContextRepository,
    options: HostOptions,
    logger: ILogger
  ) {
    super(repository, options, logger);
    this.connections = new ConnectionOptionsManager(options.settings, this);
    this.addHostOptionsSource();
  }

  public loadPageAsync(
    pageName: string,
    parameters: IDictionary<string>,
    method?: HttpMethod,
    url?: string
  ): Promise<string> {
    const provider = url
      ? new WebConnectionOptions(url, url)
      : this.connections.getConnection("callcommand");
    return provider.loadPageAsync(this, pageName, parameters, method);
  }

  public loadDataAsync(
    sourceId: SourceId,
    connectionName: string,
    parameters: IDictionary<string>,
    onDataReceived: EventHandlerWithReturn<Array<Data>, boolean>
  ): Promise<void> {
    let connectionInfo = this.connections.getConnection(connectionName);
    return connectionInfo.loadDataAsync(
      this,
      sourceId,
      parameters,
      onDataReceived
    );
  }

  async getOrLoadDbLibAsync(): Promise<any> {
    let retVal;
    if (typeof alasql === "undefined") {
      if (Util.IsNullOrEmpty(this.options.dbLibPath)) {
        throw new ClientException(
          `Error in load 'alasql'. 'DbLibPath' not configure properly in host object.`
        );
      }
      retVal = await $bc.util.getLibAsync("alasql", this.options.dbLibPath);
    } else {
      retVal = alasql;
    }
    return retVal;
  }

  private addHostOptionsSource() {
    if (this.options.sources) {
      Object.getOwnPropertyNames(this.options.sources).forEach((key) => {
        const source = this.options.sources[key];
        if (source instanceof Array) {
          this.setAsSource(key.toLowerCase(), source);
        } else {
          this.setAsSource(key.toLowerCase(), source.data, source.options);
        }
      });
    }
  }
}
