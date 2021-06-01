import ISource from "../data/ISource";
import DataUtil from "../data/DataUtil";
import ILogger from "../logger/ILogger";
import IContext from "./IContext";
import EventManager from "../event/EventManager";
import { SourceHandler, SourceId } from "../type-alias";
import IContextRepository from "../repository/IContextRepository";
import DataSet from "../data/DataSet";
import IDictionary from "../IDictionary";
import IContextHostOptions from "../options/IContextHostOptions";

export default abstract class Context implements IContext {
  protected readonly repository: IContextRepository;
  readonly logger: ILogger;
  readonly options: IContextHostOptions;
  readonly onDataSourceAdded: EventManager<ISource>;

  constructor(
    repository: IContextRepository,
    options: IContextHostOptions,
    logger: ILogger
  ) {
    this.repository = repository;
    this.logger = logger;
    this.options = options;
    this.onDataSourceAdded = new EventManager<ISource>();
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

  public checkSourceHeartbeatAsync(source: string): Promise<boolean> {
    //TODO: must complete
    throw new Error("Method not implemented.");
  }

  protected onDataSourceAddedHandler(source: ISource) {
    var handler = this.repository.Resolves.get(source.data.id);
    if (handler) {
      handler.Trigger(source);
      this.repository.Resolves.delete(source.data.id);
    }
    this.onDataSourceAdded.Trigger(source);
  }

  public addOnSourceSetHandler(
    sourceId: SourceId,
    handler: SourceHandler
  ): boolean {
    return this.repository.addHandler(sourceId, handler);
  }

  public tryToGetSource(sourceId: SourceId): ISource {
    return this.repository.tryToGet(sourceId);
  }

  public waitToGetSourceAsync(sourceId: SourceId): Promise<ISource> {
    return this.repository.waitToGetAsync(sourceId);
  }

  public setAsSource(
    sourceId: SourceId,
    value: any,
    replace: boolean = true,
    preview?: boolean
  ) {
    var source = DataUtil.ToDataSource(sourceId, value, replace);
    this.setSource(source, preview);
  }

  public setSource(source: ISource, preview?: boolean): void {
    this.repository.setSource(source, preview);
    this.onDataSourceAddedHandler(source);
  }

  public Dispose() {}
}
