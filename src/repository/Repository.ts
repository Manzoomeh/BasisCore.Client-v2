import { inject, injectable } from "tsyringe";
import ISource from "../data/ISource";
import { MergeType } from "../enum";
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

  public setSourceFromOwner(source: ISource) {
    if (this.repository.has(source.id)) {
      this.repository.delete(source.id);
    }
    this.eventManager.get(source.id)?.Trigger(source);
    this.logger.logInformation(`${source.id} Added from owner context.`);
  }

  private setSourceEx(source: ISource) {
    if (source.mergeType == MergeType.replace) {
      this.repository.set(source.id, source);
    } else if (source.mergeType == MergeType.append) {
      const oldSource = this.repository.get(source.id);
      if (oldSource) {
        source.rows.forEach((row) => oldSource.rows.push(row));
      } else {
        this.repository.set(source.id, source);
      }
    }
  }

  public setSource(source: ISource, preview?: boolean) {
    this.setSourceEx(source);
    if (preview) {
      this.logger.logSource(source);
    }
    this.eventManager.get(source.id)?.Trigger(source);
    this.logger.logInformation(`${source.id} Added.`);
  }

  public addHandler(sourceId: SourceId, handler: SourceHandler): SourceHandler {
    const key = sourceId?.toLowerCase();
    let handlers = this.eventManager.get(key);
    if (!handlers) {
      handlers = new EventManager<ISource>();
      this.eventManager.set(key, handlers);
    }
    const added = handlers.Add(handler);
    if (added) {
      this.logger.logInformation(`handler Added for ${key}.`);
    }
    return added;
  }

  public removeHandler(sourceId: SourceId, handler: SourceHandler) {
    this.eventManager[sourceId?.toLowerCase()]?.Remove(handler);
  }

  public waitToGetAsync(sourceId: SourceId): Promise<ISource> {
    return new Promise<ISource>((resolve) => {
      sourceId = sourceId?.toLowerCase();
      this.logger.logInformation("wait for %s", sourceId);

      let handler = this.resolves.get(sourceId);
      if (!handler) {
        handler = new EventManager<ISource>();
        this.resolves.set(sourceId, handler);
      }
      handler.Add(resolve);
    });
  }
}
