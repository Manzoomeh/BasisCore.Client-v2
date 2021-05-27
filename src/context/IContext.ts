import DataSet from "../data/DataSet";
import IDictionary from "../IDictionary";
import ILogger from "../logger/ILogger";
import IHostOptions from "../options/IHostOptions";
import IRepository from "../repository/IRepository";
import { SourceId } from "../type-alias";

export default interface IContext {
  repository: IRepository;
  logger: ILogger;
  options: IHostOptions;

  checkSourceHeartbeatAsync(sourceId: SourceId): Promise<boolean>;

  loadPageAsync(
    pageName: string,
    rawCommand: string,
    pageSize: string,
    callDepth: number
  ): Promise<string>;

  loadDataAsync(
    sourceId: SourceId,
    connectionName: string,
    parameters: IDictionary<string>
  ): Promise<DataSet>;

  getOrLoadDbLibAsync(): Promise<any>;
  getOrLoadObjectAsync(object: string, url: string): Promise<any>;
}
