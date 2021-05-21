import IDataSource from "../data/IDataSource";
import ILogger from "../logger/ILogger";
import IRepository from "../repository/IRepository";

export default interface IContext {
  Repository: IRepository;
  Logger: ILogger;
  TryGetDataSource(dataSourceId: string): IDataSource;
  WaitToGetDataSourceAsync(dataSourceId: string): Promise<IDataSource>;
  CheckSourceHeartbeatAsync(source: string): Promise<boolean>;
}
