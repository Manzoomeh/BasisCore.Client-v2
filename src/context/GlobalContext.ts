import { inject, singleton } from "tsyringe";
import IDataSource from "../data/IDataSource";
import ILogger from "../logger/ILogger";
import ConnectionOptionsManager from "../options/connection-options/ConnectionOptionsManager";
import { HostOptions } from "../options/HostOptions";
import IRepository from "../repository/IRepository";
import Context from "./Context";

@singleton()
export default class GlobalContext extends Context {
  readonly connections: ConnectionOptionsManager;
  constructor(
    @inject("IRepository") repository: IRepository,
    @inject("ILogger") logger: ILogger,
    options: HostOptions
  ) {
    super(repository, options, logger);
    this.connections = new ConnectionOptionsManager(options.Settings);
  }

  public TryGetDataSource(dataSourceId: string): IDataSource {
    return this.Repository.get(dataSourceId);
  }

  public async loadPageAsync(
    pageName: string,
    rawCommand: string,
    pageSize: string,
    callDepth: number
  ): Promise<string> {
    var parameters: any = {
      fileNames: pageName,
      dmnid: this.options.getDefault("dmnid"),
      sitesize: pageSize,
      command: rawCommand,
    };
    var connectionInfo = this.connections.GetConnection("callcommand");
    return await connectionInfo.LoadPageAsync(this, pageName, parameters);
  }
}
