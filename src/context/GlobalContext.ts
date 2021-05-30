import { inject, injectable } from "tsyringe";
import DataSet from "../data/DataSet";
import ClientException from "../exception/ClientException";
import IDictionary from "../IDictionary";
import ILogger from "../logger/ILogger";
import ConnectionOptionsManager from "../options/connection-options/ConnectionOptionsManager";
import { HostOptions } from "../options/HostOptions";
import IContextRepository from "../repository/IContextRepository";
import { SourceId } from "../type-alias";
import Util from "../Util";
import Context from "./Context";

declare var alasql: any;

@injectable()
export default class GlobalContext extends Context {
  readonly connections: ConnectionOptionsManager;
  readonly loadLibDic: IDictionary<Promise<any>> = {};
  constructor(
    @inject("IContextRepository") repository: IContextRepository,
    @inject("ILogger") logger: ILogger,
    options: HostOptions
  ) {
    super(repository, options, logger);
    this.connections = new ConnectionOptionsManager(options.Settings, this);
  }

  public loadPageAsync(
    pageName: string,
    rawCommand: string,
    pageSize: string,
    callDepth: number
  ): Promise<string> {
    var parameters: any = {
      fileNames: pageName,
      dmnid: this.options.getDefault("dmnid"),
      siteSize: pageSize,
      command: rawCommand,
    };
    //TODO: add business for callDepth
    var connectionInfo = this.connections.GetConnection("callcommand");
    return connectionInfo.loadPageAsync(this, pageName, parameters);
  }

  public loadDataAsync(
    sourceId: SourceId,
    connectionName: string,
    parameters: IDictionary<string>
  ): Promise<DataSet> {
    var connectionInfo = this.connections.GetConnection(connectionName);
    return connectionInfo.loadDataAsync(this, sourceId, parameters);
  }

  async getOrLoadDbLibAsync(): Promise<any> {
    var retVal;
    if (typeof alasql === "undefined") {
      if (Util.IsNullOrEmpty(this.options.DbLibPath)) {
        throw new ClientException(
          `Error in load 'alasql'. 'DbLibPath' Not Configure Properly In Host Object.`
        );
      }
      retVal = await this.getOrLoadObjectAsync(
        "alasql",
        this.options.DbLibPath
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
          var script = document.createElement("script");
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
}
