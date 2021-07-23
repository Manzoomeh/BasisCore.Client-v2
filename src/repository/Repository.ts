import { inject, injectable } from "tsyringe";
import ISource from "../data/ISource";
import { DataStatus, MergeType } from "../enum";
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
    this.logger.logInformation(`${source.id} Added from owner context...`);
  }

  private setSourceEx(newSource: ISource): ISource {
    const oldSource = this.repository.get(newSource.id);
    if (newSource.mergeType == MergeType.replace) {
      if (oldSource) {
        oldSource.replace(newSource);
      } else {
        this.repository.set(newSource.id, newSource);
      }
    } else if (newSource.mergeType == MergeType.append) {
      if (oldSource) {
        //update or insert
        if (newSource.keyFieldName && oldSource.keyFieldName) {
          newSource.rows.forEach((row) => {
            const newRowKey = Reflect.get(row, newSource.keyFieldName);
            const newRowStatus = newSource.statusFieldName
              ? Reflect.get(row, newSource.statusFieldName)
              : DataStatus.added;
            if (newRowStatus == DataStatus.added) {
              oldSource.addRow(row);
            } else {
              const oldRowIndex = oldSource.rows.findIndex(
                (x) => Reflect.get(x, oldSource.keyFieldName) == newRowKey
              );
              if (oldRowIndex !== -1) {
                if (newRowStatus == DataStatus.deleted) {
                  oldSource.removeRowFormIndex(oldRowIndex);
                } else if (newRowStatus == DataStatus.edited) {
                  oldSource.replaceRowFromIndex(oldRowIndex, row);
                }
              }
            }
          });
        } else {
          oldSource.addRows(newSource.rows);
        }
      } else {
        this.repository.set(newSource.id, newSource);
      }
    }
    return oldSource ?? newSource;
  }

  public setSource(source: ISource, preview?: boolean): ISource {
    const resultSource = this.setSourceEx(source);
    if (preview) {
      this.logger.logSource(source);
    }
    this.eventManager.get(resultSource.id)?.Trigger(resultSource);
    this.logger.logInformation(
      `${resultSource.id} ${source === resultSource ? "Added" : "Updated"}...`
    );
    return resultSource;
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
      this.logger.logInformation(`handler Added for ${key}...`);
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
