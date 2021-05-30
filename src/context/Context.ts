import IDataSource from "../data/IDataSource";
import DataUtil from "../data/DataUtil";
import ILogger from "../logger/ILogger";
import IContext from "./IContext";
import EventManager from "../event/EventManager";
import { SourceId } from "../type-alias";
import IContextRepository from "../repository/IContextRepository";
import DataSet from "../data/DataSet";
import IDictionary from "../IDictionary";
import Util from "../Util";
import ClientException from "../exception/ClientException";
import IContextHostOptions from "../options/IContextHostOptions";

export default abstract class Context implements IContext {
  readonly repository: IContextRepository;
  readonly logger: ILogger;
  readonly options: IContextHostOptions;
  readonly onDataSourceAdded: EventManager<IDataSource>;

  constructor(
    repository: IContextRepository,
    options: IContextHostOptions,
    logger: ILogger
  ) {
    this.repository = repository;
    this.logger = logger;
    this.options = options;
    this.onDataSourceAdded = new EventManager<IDataSource>();
  }
  abstract getOrLoadDbLibAsync(): Promise<any>;
  abstract getOrLoadObjectAsync(object: string, url: string): Promise<any>;

  public abstract loadDataAsync(
    sourceId: SourceId,
    connectionName: string,
    parameters: IDictionary<string>
  ): Promise<DataSet>;

  public abstract loadPageAsync(
    pageName: string,
    rawCommand: string,
    pageSize: string,
    callDepth: number
  ): Promise<string>;

  checkSourceHeartbeatAsync(source: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  public setAsSource(sourceId: SourceId, value: any, replace: boolean = true) {
    var source = DataUtil.ToDataSource(sourceId, value, replace);
    this.setSource(source);
  }
  public setSource(source: IDataSource): void {
    this.repository.setSource(source);
    this.onDataSourceAddedHandler(source);
  }

  protected onDataSourceAddedHandler(source: IDataSource) {
    var handler = this.repository.Resolves.get(source.data.id);
    if (handler) {
      handler.Trigger(source);
      this.repository.Resolves.delete(source.data.id);
    }
    this.onDataSourceAdded.Trigger(source);
  }
}
