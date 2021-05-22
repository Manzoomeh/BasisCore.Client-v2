import { inject, singleton } from "tsyringe";
import IDataSource from "../data/IDataSource";
import ILogger from "../logger/ILogger";
import { HostOptions } from "../options/HostOptions";
import IRepository from "../repository/IRepository";
import Context from "./Context";

@singleton()
export default class GlobalContext extends Context {
  constructor(
    @inject("IRepository") repository: IRepository,
    @inject("ILogger") logger: ILogger,
    options: HostOptions
  ) {
    super(repository, options, logger);
  }

  TryGetDataSource(dataSourceId: string): IDataSource {
    return this.Repository.get(dataSourceId);
  }
}
