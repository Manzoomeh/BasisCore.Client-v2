import { inject, injectable } from "tsyringe";
import IDataSource from "../data/IDataSource";
import { EventHandler } from "../event/EventHandler";
import EventManager from "../event/EventManager";
import ILogger from "../logger/ILogger";
import IRepository from "./IRepository";

@injectable()
export default class Repository implements IRepository {
  readonly repository: Map<string, IDataSource> = new Map();
  readonly eventManager: EventManager<IDataSource> =
    new EventManager<IDataSource>();
  readonly logger: ILogger;
  constructor(@inject("ILogger") logger: ILogger) {
    this.logger = logger;
  }
  get(key: string): IDataSource {
    return this.repository.get(key?.toLowerCase());
  }

  public setSource(source: IDataSource) {
    this.repository.set(source.Data.Name?.toLowerCase(), source);
    this.logger.LogInformation(`${source.Data.Name} Added.`);
    this.eventManager.Trigger(source);
  }

  public addHandler(handler: EventHandler<IDataSource>) {
    this.logger.LogInformation(`handler Added.`);
    this.eventManager.Add(handler);
  }

  public RemoveHandler(handler: EventHandler<IDataSource>) {
    this.eventManager.Remove(handler);
  }
}
