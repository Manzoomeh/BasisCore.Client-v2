import { inject, injectable } from "tsyringe";
import ISource from "../data/ISource";
import EventManager from "../event/EventManager";
import ILogger from "../logger/ILogger";
import { SourceId, SourceHandler } from "../type-alias";
import IContextRepository from "./IContextRepository";

@injectable()
export default class Repository implements IContextRepository {
  readonly repository: Map<SourceId, ISource> = new Map();
  readonly eventManager: Map<SourceId, EventManager<ISource>> = new Map<
    SourceId,
    EventManager<ISource>
  >();
  readonly logger: ILogger;
  readonly resolves = new Map<string, EventManager<ISource>>();
  constructor(@inject("ILogger") logger: ILogger) {
    this.logger = logger;
  }
  public tryToGet(sourceId: SourceId): ISource {
    return this.repository.get(sourceId?.toLowerCase());
  }

  public setSource(source: ISource, preview?: boolean) {
    const key = source.data.id;
    this.repository.set(key, source);
    if (preview) {
      this.logger.logSource(source);
    }
    this.eventManager.get(key)?.Trigger(source);
    this.logger.logInformation(`${source.data.id} Added.`);
  }

  public addHandler(sourceId: SourceId, handler: SourceHandler) {
    const key = sourceId?.toLowerCase();
    let handlers = this.eventManager.get(key);
    if (!handlers) {
      handlers = new EventManager<ISource>();
      this.eventManager.set(key, handlers);
    }
    const added = handlers.Add(handler);
    if (added) {
      this.logger.logInformation(`handler Added for ${sourceId}.`);
    }
    return added;
  }

  public removeHandler(sourceId: SourceId, handler: SourceHandler) {
    this.eventManager[sourceId?.toLowerCase()]?.Remove(handler);
  }

  public waitToGetAsync(sourceId: SourceId): Promise<ISource> {
    return new Promise<ISource>((resolve) => {
      sourceId = sourceId?.toLowerCase();
      this.logger.logInformation(`wait for ${sourceId}`);
      let handler = this.resolves.get(sourceId);
      if (!handler) {
        handler = new EventManager<ISource>();
        this.resolves.set(sourceId, handler);
      }
      handler.Add(resolve);
    });
  }
}
