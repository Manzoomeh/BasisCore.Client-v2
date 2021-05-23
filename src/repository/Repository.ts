import { inject, injectable } from "tsyringe";
import IDataSource from "../data/IDataSource";
import { EventHandler } from "../event/EventHandler";
import EventManager from "../event/EventManager";
import ILogger from "../logger/ILogger";
import { SourceId, SourceHandler } from "../type-alias";
import IRepository from "./IRepository";

@injectable()
export default class Repository implements IRepository {
  readonly repository: Map<SourceId, IDataSource> = new Map();
  readonly eventManager: Map<SourceId, EventManager<IDataSource>> = new Map<
    SourceId,
    EventManager<IDataSource>
  >();
  readonly logger: ILogger;
  constructor(@inject("ILogger") logger: ILogger) {
    this.logger = logger;
  }
  get(sourceId: SourceId): IDataSource {
    return this.repository.get(sourceId?.toLowerCase());
  }

  public setSource(source: IDataSource) {
    const key = source.data.Id?.toLowerCase();
    this.repository.set(key, source);
    this.eventManager.get(key)?.Trigger(source);
    this.logger.LogInformation(`${source.data.Id} Added.`);
  }

  public addHandler(sourceId: SourceId, handler: SourceHandler) {
    const key = sourceId?.toLowerCase();
    let handlers = this.eventManager.get(key);
    if (!handlers) {
      handlers = new EventManager<IDataSource>();
      this.eventManager.set(key, handlers);
    }
    const added = handlers.Add(handler);
    if (added) {
      this.logger.LogInformation(`handler Added for ${sourceId}.`);
    }
    return added;
  }

  public RemoveHandler(sourceId: SourceId, handler: SourceHandler) {
    this.eventManager[sourceId?.toLowerCase()]?.Remove(handler);
  }
}
