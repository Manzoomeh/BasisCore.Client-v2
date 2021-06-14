import DataSet from "../data/DataSet";
import { EventHandler } from "../event/EventHandler";
import ClientException from "../exception/ClientException";
import IDictionary from "../IDictionary";
import ILogger from "../logger/ILogger";
import ConnectionOptionsManager from "../options/connection-options/ConnectionOptionsManager";
import { HostOptions } from "../options/HostOptions";
import IContextRepository from "../repository/IContextRepository";
import { HttpMethod, SourceId } from "../type-alias";
import Util from "../Util";
import Context from "./Context";

declare var alasql: any;

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
    method?: HttpMethod
  ): Promise<string> {
    var connectionInfo = this.connections.getConnection("callcommand");
    return connectionInfo.loadPageAsync(this, pageName, parameters, method);
  }

  public loadDataAsync(
    sourceId: SourceId,
    connectionName: string,
    parameters: IDictionary<string>,
    onDataReceived: EventHandler<DataSet>
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
      retVal = await this.getOrLoadObjectAsync(
        "alasql",
        this.options.dbLibPath
      );
    } else {
      retVal = alasql;
    }
    return retVal;
  }

  public getOrLoadObjectAsync(object: string, url: string): Promise<any> {
    let retVal: Promise<any> = null;
    retVal = this.loadLibDic[object];
    if (!retVal) {
      retVal = this.loadLibDic[object] = new Promise((resolve, reject) => {
        if (eval(`typeof(${object})`) === "undefined") {
          const script = document.createElement("script");
          script.onload = (x) => resolve(eval(object));
          script.onerror = (x) => reject(x);
          script.setAttribute("type", "text/javascript");
          script.setAttribute("src", url);
          document.getElementsByTagName("head")[0].appendChild(script);
        } else {
          resolve(eval(object));
        }
      });
    }
    return retVal;
  }

  private addHostOptionsSource() {
    if (this.options.sources) {
      Object.getOwnPropertyNames(this.options.sources).forEach((key) => {
        this.setAsSource(key.toLowerCase(), this.options.sources[key]);
      });
    }
  }
}
