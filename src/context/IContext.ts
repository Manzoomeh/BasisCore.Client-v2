import IDataSource from "../data/IDataSource";
import ILogger from "../logger/ILogger";
import IHostOptions from "../options/IHostOptions";
import IRepository from "../repository/IRepository";
import { SourceId } from "../type-alias";

export default interface IContext {
  Repository: IRepository;
  Logger: ILogger;
  options: IHostOptions;
  TryGetDataSource(sourceId: SourceId): IDataSource;
  WaitToGetDataSourceAsync(sourceId: SourceId): Promise<IDataSource>;
  CheckSourceHeartbeatAsync(sourceId: SourceId): Promise<boolean>;
  loadPageAsync(
    pageName: string,
    rawCommand: string,
    pageSize: string,
    callDepth: number
  ): Promise<string>;
}
