import { inject, singleton } from "tsyringe";
import DataSet from "../data/DataSet";
import IDictionary from "../IDictionary";
import ILogger from "../logger/ILogger";
import ConnectionOptionsManager from "../options/connection-options/ConnectionOptionsManager";
import { HostOptions } from "../options/HostOptions";
import IContextRepository from "../repository/IContextRepository";
import { SourceId } from "../type-alias";
import Context from "./Context";

@singleton()
export default class GlobalContext extends Context {
  readonly connections: ConnectionOptionsManager;
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
}
