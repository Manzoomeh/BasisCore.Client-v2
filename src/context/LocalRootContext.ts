import { inject, injectable } from "tsyringe";
import ISource from "../data/ISource";
import { HostOptions } from "../options/HostOptions";
import IContextRepository from "../repository/IContextRepository";
import { SourceHandler, SourceId } from "../type-alias";
import Context from "./Context";
import RootContext from "./RootContext";

@injectable()
export default class LocalRootContext extends RootContext {
  readonly owner: Context;
  readonly handler: SourceHandler;

  constructor(
    @inject("IContextRepository") repository: IContextRepository,
    @inject("OwnerContext") owner: Context,
    options: HostOptions
  ) {
    super(repository, options, owner.logger);
    this.owner = owner;
    this.handler = this.owner.onDataSourceSet.Add(
      this.setSourceFromOwner.bind(this)
    );
  }

  public tryToGetSource(sourceId: SourceId): ISource {
    return (
      super.tryToGetSource(sourceId) ?? this.owner.tryToGetSource(sourceId)
    );
  }

  dispose(): void {
    this.owner.onDataSourceSet.Remove(this.handler);
  }
}
