import ISource from "../data/ISource";
import ILogger from "../logger/ILogger";
import IContext from "./IContext";
import EventManager from "../event/EventManager";
import { HttpMethod, SourceHandler, SourceId } from "../type-alias";
import IContextRepository from "../repository/IContextRepository";
import IDictionary from "../IDictionary";
import IContextHostOptions from "../options/IContextHostOptions";
import Data from "../data/Data";
import Source from "../data/Source";
import ISourceOptions from "./ISourceOptions";
import { EventHandlerWithReturn } from "../event/EventHandlerWithReturn";

export default abstract class Context implements IContext {
  protected readonly repository: IContextRepository;
  readonly logger: ILogger;
  readonly options: IContextHostOptions;
  readonly onDataSourceSet: EventManager<ISource>;

  constructor(
    repository: IContextRepository,
    options: IContextHostOptions,
    logger: ILogger
  ) {
    this.repository = repository;
    this.logger = logger;
    this.options = options;
    this.onDataSourceSet = new EventManager<ISource>();
  }

  abstract getOrLoadDbLibAsync(): Promise<any>;

  public abstract loadDataAsync(
    sourceId: SourceId,
    connectionName: string,
    parameters: IDictionary<string>,
    onDataReceived: EventHandlerWithReturn<Array<Data>, boolean>
  ): Promise<void>;

  public abstract loadPageAsync(
    pageName: string,
    parameters: IDictionary<string>,
    method?: HttpMethod,
    url?: string
  ): Promise<string>;

  public checkSourceHeartbeatAsync(source: string): Promise<boolean> {
    //TODO: must complete
    throw new Error("Method not implemented.");
  }

  private onDataSourceSetHandler(source: ISource) {
    var handler = this.repository.resolves.get(source.id);
    if (handler) {
      handler.Trigger(source);
      this.repository.resolves.delete(source.id);
    }
    this.onDataSourceSet.Trigger(source);
  }

  public addOnSourceSetHandler(
    sourceId: SourceId,
    handler: SourceHandler
  ): void {
    this.repository.addHandler(sourceId, handler);
  }

  removeOnSourceSetHandler(sourceId: SourceId, handler: SourceHandler): void {
    this.repository.removeHandler(sourceId, handler);
  }

  public tryToGetSource(sourceId: SourceId): ISource {
    return this.repository.tryToGet(sourceId);
  }

  public async waitToGetSourceAsync(sourceId: SourceId): Promise<ISource> {
    var retVal = this.tryToGetSource(sourceId);
    if (!retVal) {
      retVal = await this.repository.waitToGetAsync(sourceId);
    }
    return retVal;
  }

  public setAsSource(
    sourceId: SourceId,
    data: any,
    options?: ISourceOptions,
    preview?: boolean
  ) {
    var source = new Source(sourceId, data, options);
    this.setSource(source, preview);
  }

  public setSource(source: ISource, preview?: boolean): void {
    const resultSource = this.repository.setSource(source, preview);
    this.onDataSourceSetHandler(resultSource);
  }

  public setSourceFromOwner(source: ISource) {
    this.repository.setSourceFromOwner(source);
    this.onDataSourceSetHandler(source);
  }

  dispose() {}
}
