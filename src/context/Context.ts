import IDataSource from "../data/IDataSource";
import DataUtil from "../data/DataUtil";
import { EventHandler } from "../event/EventHandler";
import ILogger from "../logger/ILogger";
import IHostOptions from "../options/IHostOptions";
import IRepository from "../repository/IRepository";
import IContext from "./IContext";
import EventManager from "../event/EventManager";

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

  abstract TryGetDataSource(dataSourceId: string): IDataSource;
  WaitToGetDataSourceAsync(dataSourceId: string): Promise<IDataSource> {
    return new Promise<IDataSource>((resolve) => {
      var retVal = this.TryGetDataSource(dataSourceId);
      if (retVal) {
        resolve(retVal);
      } else {
        dataSourceId = dataSourceId?.toLowerCase();
        this.Logger.LogInformation(`wait for ${dataSourceId}`);
        var handler = this.Resolves.get(dataSourceId);
        if (!handler) {
          handler = new EventManager<IDataSource>();
          this.Resolves.set(dataSourceId, handler);
        }
        handler.Add(resolve);
      }
    });
  }
  CheckSourceHeartbeatAsync(source: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  addAsSource(sourecName: string, value: any, replace: boolean = true) {
    var source = DataUtil.ToDataSource(sourecName, value, replace);
    this.AddSource(source);
  }
  AddSource(source: IDataSource): void {
    this.Repository.setSource(source);
    this.OnDataSourceAddedHandler(source);
  }

  private OnDataSourceAddedHandler(source: IDataSource) {
    var handler = this.Resolves.get(source.data.Name);
    if (handler) {
      handler.Trigger(source);
      this.Resolves.delete(source.data.Name);
    }
    this.OnDataSourceAdded.Trigger(source);
  }

  AddSibscriber(callback: EventHandler<IDataSource>) {
    this.Repository.addHandler(callback);
  }
}
