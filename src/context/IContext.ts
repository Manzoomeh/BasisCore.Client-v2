import DataSet from "../data/DataSet";
import ISource from "../data/ISource";
import { MergeType } from "../enum";
import { EventHandler } from "../event/EventHandler";
import IDictionary from "../IDictionary";
import ILogger from "../logger/ILogger";
import IContextHostOptions from "../options/IContextHostOptions";
import { HttpMethod, SourceHandler, SourceId } from "../type-alias";

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
    onDataReceived: EventHandler<DataSet>
  ): Promise<void>;

  getOrLoadDbLibAsync(): Promise<any>;
  getOrLoadObjectAsync(object: string, url: string): Promise<any>;

  setAsSource(
    sourceId: SourceId,
    value: any,
    mergeType?: MergeType,
    preview?: boolean
  );
  setSource(source: ISource, preview?: boolean): void;
  addOnSourceSetHandler(
    sourceId: SourceId,
    handler: SourceHandler
  ): SourceHandler;
  tryToGetSource(sourceId: SourceId): ISource;
  waitToGetSourceAsync(sourceId: SourceId): Promise<ISource>;
}
