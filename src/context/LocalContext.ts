import { inject, injectable } from "tsyringe";
import DataSet from "../data/DataSet";
import ISource from "../data/ISource";
import { EventHandler } from "../event/EventHandler";
import IDictionary from "../IDictionary";
import { HostOptions } from "../options/HostOptions";
import IContextRepository from "../repository/IContextRepository";
import { HttpMethod, SourceHandler, SourceId } from "../type-alias";
import Context from "./Context";
import ILocalContext from "./ILocalContext";

@injectable()
export default class LocalContext extends Context implements ILocalContext {
  readonly owner: Context;
  readonly handler: SourceHandler;

  constructor(
    @inject("IContextRepository") repository: IContextRepository,
    @inject("OwnerContext") owner: Context,
    @inject("HostOptions") options: HostOptions
  ) {
    super(repository, options, owner.logger);

    //console.log("ctor", options);
    this.owner = owner;
    this.handler = this.owner.onDataSourceSet.Add(
      this.setSourceFromOwner.bind(this)
    );
  }

  dispose(): void {
    this.owner.onDataSourceSet.Remove(this.handler);
  }

  public getOrLoadDbLibAsync(): Promise<any> {
    return this.owner.getOrLoadDbLibAsync();
  }

  public getOrLoadObjectAsync(object: string, url: string): Promise<any> {
    return this.getOrLoadObjectAsync(object, url);
  }

  public loadPageAsync(
    pageName: string,
    parameters: IDictionary<string>,
    method?: HttpMethod
  ): Promise<string> {
    return this.owner.loadPageAsync(pageName, parameters, method);
  }

  public loadDataAsync(
    sourceId: SourceId,
    connectionName: string,
    parameters: IDictionary<string>,
    onDataReceived: EventHandler<DataSet>
  ): Promise<void> {
    return this.owner.loadDataAsync(
      sourceId,
      connectionName,
      parameters,
      onDataReceived
    );
  }

  public tryToGetSource(sourceId: SourceId): ISource {
    return (
      super.tryToGetSource(sourceId) ?? this.owner.tryToGetSource(sourceId)
    );
  }
}
