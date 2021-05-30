import { inject, injectable } from "tsyringe";
import IDataSource from "../data/IDataSource";
import EventManager from "../event/EventManager";
import ILogger from "../logger/ILogger";
import { SourceId, SourceHandler } from "../type-alias";
import IContextRepository from "./IContextRepository";

@injectable()
export default class Repository implements IContextRepository {
  readonly repository: Map<SourceId, IDataSource> = new Map();
  readonly eventManager: Map<SourceId, EventManager<IDataSource>> = new Map<
    SourceId,
    EventManager<IDataSource>
  >();
  readonly logger: ILogger;
  readonly Resolves = new Map<string, EventManager<IDataSource>>();
  constructor(@inject("ILogger") logger: ILogger) {
    this.logger = logger;
  }
  public tryToGet(sourceId: SourceId): IDataSource {
    return this.repository.get(sourceId?.toLowerCase());
  }

  public setSource(source: IDataSource) {
    const key = source.data.id?.toLowerCase();
    this.repository.set(key, source);
    this.eventManager.get(key)?.Trigger(source);
    this.logger.LogInformation(`${source.data.id} Added.`);
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

  public removeHandler(sourceId: SourceId, handler: SourceHandler) {
    this.eventManager[sourceId?.toLowerCase()]?.Remove(handler);
  }

  public waitToGetAsync(sourceId: SourceId): Promise<IDataSource> {
    return new Promise<IDataSource>((resolve) => {
      var retVal = this.tryToGet(sourceId);
      if (retVal) {
        resolve(retVal);
      } else {
        sourceId = sourceId?.toLowerCase();
        this.logger.LogInformation(`wait for ${sourceId}`);
        let handler = this.Resolves.get(sourceId);
        if (!handler) {
          handler = new EventManager<IDataSource>();
          this.Resolves.set(sourceId, handler);
        }
        handler.Add(resolve);
      }
    });
  }
}
