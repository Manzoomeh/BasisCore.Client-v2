import { inject, injectable } from "tsyringe";
import DataSet from "../data/DataSet";
import IDataSource from "../data/IDataSource";
import IDictionary from "../IDictionary";
import IContextRepository from "../repository/IContextRepository";
import { SourceId } from "../type-alias";
import Context from "./Context";
import ILocalContext from "./ILocalContext";

@injectable()
export default class LocalContext extends Context implements ILocalContext {
  readonly owner: Context;
  constructor(
    @inject("OwnerBaseRepository") repository: IContextRepository,
    @inject("OwnerContext") owner: Context
  ) {
    super(repository, owner.options, owner.logger);
    this.owner = owner;
    owner.onDataSourceAdded.Add(this.onDataSourceAddedHandler.bind(this));
    console.log("local context");
  }

  public loadPageAsync(
    pageName: string,
    rawCommand: string,
    pageSize: string,
    callDepth: number
  ): Promise<string> {
    return this.owner.loadPageAsync(pageName, rawCommand, pageSize, callDepth);
  }

  public async loadDataAsync(
    sourceId: SourceId,
    connectionName: string,
    parameters: IDictionary<string>
  ): Promise<DataSet> {
    return this.owner.loadDataAsync(sourceId, connectionName, parameters);
  }
}
