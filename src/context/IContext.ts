import DataSet from "../data/DataSet";
import ISource from "../data/ISource";
import IDictionary from "../IDictionary";
import ILogger from "../logger/ILogger";
import IContextHostOptions from "../options/IContextHostOptions";
import IRepository from "../repository/IRepository";
import { SourceHandler, SourceId } from "../type-alias";

export default interface IContext {
  //repository: IRepository;
  logger: ILogger;
  options: IContextHostOptions;

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

  setSource(source: ISource): void;
  addOnSourceSetHandler(sourceId: SourceId, handler: SourceHandler): boolean;
  tryToGetSource(sourceId: SourceId): ISource;
  waitToGetSourceAsync(sourceId: SourceId): Promise<ISource>;
}
