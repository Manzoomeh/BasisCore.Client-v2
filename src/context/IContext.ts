import Data from "../data/Data";
import ISource from "../data/ISource";
import { EventHandler } from "../event/EventHandler";
import IDictionary from "../IDictionary";
import ILogger from "../logger/ILogger";
import IContextHostOptions from "../options/IContextHostOptions";
import { HttpMethod, SourceHandler, SourceId } from "../type-alias";
import ISourceOptions from "./ISourceOptions";

export default interface IContext {
  logger: ILogger;
  options: IContextHostOptions;

  checkSourceHeartbeatAsync(sourceId: SourceId): Promise<boolean>;

  loadPageAsync(
    pageName: string,
    parameters: IDictionary<string>,
    method?: HttpMethod
  ): Promise<string>;

  loadDataAsync(
    sourceId: SourceId,
    connectionName: string,
    parameters: IDictionary<string>,
    onDataReceived: EventHandler<Array<Data>>
  ): Promise<void>;

  getOrLoadDbLibAsync(): Promise<any>;

  setAsSource(
    sourceId: SourceId,
    data: any,
    options?: ISourceOptions,
    preview?: boolean
  ): void;
  setSource(source: ISource, preview?: boolean): void;
  addOnSourceSetHandler(
    sourceId: SourceId,
    handler: SourceHandler
  ): SourceHandler;
  tryToGetSource(sourceId: SourceId): ISource;
  waitToGetSourceAsync(sourceId: SourceId): Promise<ISource>;
}
