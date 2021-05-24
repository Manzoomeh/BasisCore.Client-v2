import IDataSource from "../data/IDataSource";
import DataUtil from "../data/DataUtil";
import ILogger from "../logger/ILogger";
import IHostOptions from "../options/IHostOptions";
import IRepository from "../repository/IRepository";
import IContext from "./IContext";
import EventManager from "../event/EventManager";
import { SourceId } from "../type-alias";

export default abstract class Context implements IContext {
  readonly Repository: IRepository;
  readonly Logger: ILogger;
  readonly options: IHostOptions;
  readonly Resolves = new Map<string, EventManager<IDataSource>>();
  readonly OnDataSourceAdded: EventManager<IDataSource>;

  constructor(repository: IRepository, options: IHostOptions, logger: ILogger) {
    this.Repository = repository;
    this.Logger = logger;
    this.options = options;
    this.OnDataSourceAdded = new EventManager<IDataSource>();
  }
  public abstract loadPageAsync(
    pageName: string,
    rawCommand: string,
    pageSize: string,
    callDepth: number
  ): Promise<string>;

  abstract TryGetDataSource(sourceId: SourceId): IDataSource;
  WaitToGetDataSourceAsync(sourceId: SourceId): Promise<IDataSource> {
    return new Promise<IDataSource>((resolve) => {
      var retVal = this.TryGetDataSource(sourceId);
      if (retVal) {
        resolve(retVal);
      } else {
        sourceId = sourceId?.toLowerCase();
        this.Logger.LogInformation(`wait for ${sourceId}`);
        let handler = this.Resolves.get(sourceId);
        if (!handler) {
          handler = new EventManager<IDataSource>();
          this.Resolves.set(sourceId, handler);
        }
        handler.Add(resolve);
      }
    });
  }
  CheckSourceHeartbeatAsync(source: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  addAsSource(sourecId: SourceId, value: any, replace: boolean = true) {
    var source = DataUtil.ToDataSource(sourecId, value, replace);
    this.AddSource(source);
  }
  AddSource(source: IDataSource): void {
    this.Repository.setSource(source);
    this.OnDataSourceAddedHandler(source);
  }

  private OnDataSourceAddedHandler(source: IDataSource) {
    var handler = this.Resolves.get(source.data.Id);
    if (handler) {
      handler.Trigger(source);
      this.Resolves.delete(source.data.Id);
    }
    this.OnDataSourceAdded.Trigger(source);
  }
}
