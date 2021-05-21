import IDataSource from "../data/IDataSource";
import Util from "../data/Utility";
import { EventHandler } from "../event/EventHandler";
import ILogger from "../logger/ILogger";
import IRepository from "../repository/IRepository";
import IContext from "./IContext";

export default abstract class Context implements IContext {
  readonly Repository: IRepository;
  readonly Logger: ILogger;
  constructor(repository: IRepository, logger: ILogger) {
    this.Repository = repository;
    this.Logger = logger;
  }

  abstract TryGetDataSource(dataSourceId: string): IDataSource;
  WaitToGetDataSourceAsync(dataSourceId: string): Promise<IDataSource> {
    throw new Error("Method not implemented.");
  }
  CheckSourceHeartbeatAsync(source: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  addAsSource(sourecName: string, value: any, replace: boolean = true) {
    var source = Util.ToDataSource(sourecName, value, replace);
    this.AddSource(source);
  }
  AddSource(source: IDataSource): void {
    this.Repository.setSource(source);
  }

  AddSibscriber(callback: EventHandler<IDataSource>) {
    this.Repository.addHandler(callback);
  }
}
