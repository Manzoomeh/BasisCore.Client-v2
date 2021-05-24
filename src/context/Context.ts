import IDataSource from "../data/IDataSource";
import DataUtil from "../data/DataUtil";
import ILogger from "../logger/ILogger";
import IHostOptions from "../options/IHostOptions";
import IContext from "./IContext";
import EventManager from "../event/EventManager";
import { SourceId } from "../type-alias";
import IContextRepository from "../repository/IContextRepository";

export default abstract class Context implements IContext {
  readonly repository: IContextRepository;
  readonly logger: ILogger;
  readonly options: IHostOptions;
  readonly OnDataSourceAdded: EventManager<IDataSource>;

  constructor(
    repository: IContextRepository,
    options: IHostOptions,
    logger: ILogger
  ) {
    this.repository = repository;
    this.logger = logger;
    this.options = options;
    this.OnDataSourceAdded = new EventManager<IDataSource>();
  }
  public abstract loadPageAsync(
    pageName: string,
    rawCommand: string,
    pageSize: string,
    callDepth: number
  ): Promise<string>;

  checkSourceHeartbeatAsync(source: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  addAsSource(sourecId: SourceId, value: any, replace: boolean = true) {
    var source = DataUtil.ToDataSource(sourecId, value, replace);
    this.addSource(source);
  }
  addSource(source: IDataSource): void {
    this.repository.setSource(source);
    this.onDataSourceAddedHandler(source);
  }

  private onDataSourceAddedHandler(source: IDataSource) {
    var handler = this.repository.Resolves.get(source.data.Id);
    if (handler) {
      handler.Trigger(source);
      this.repository.Resolves.delete(source.data.Id);
    }
    this.OnDataSourceAdded.Trigger(source);
  }
}
