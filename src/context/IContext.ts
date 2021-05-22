import IDataSource from "../data/IDataSource";
import ILogger from "../logger/ILogger";
import IHostOptions from "../options/IHostOptions";
import IRepository from "../repository/IRepository";

export default interface IContext {
  Repository: IRepository;
  Logger: ILogger;
  options: IHostOptions;
  TryGetDataSource(dataSourceId: string): IDataSource;
  WaitToGetDataSourceAsync(dataSourceId: string): Promise<IDataSource>;
  CheckSourceHeartbeatAsync(source: string): Promise<boolean>;
}
