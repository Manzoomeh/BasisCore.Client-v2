import { inject, injectable } from "tsyringe";
import DataSet from "../data/DataSet";
import IDictionary from "../IDictionary";
import OwnerBaseRepository from "../repository/OwnerBaseRepository";
import { SourceId } from "../type-alias";
import Context from "./Context";
import ILocalContext from "./ILocalContext";

@injectable()
export default class LocalContext extends Context implements ILocalContext {
  readonly owner: Context;

  constructor(
    repository: OwnerBaseRepository,
    @inject("OwnerContext") owner: Context
  ) {
    super(repository, owner.options, owner.logger);
    this.owner = owner;
    owner.onDataSourceAdded.Add(this.onDataSourceAddedHandler.bind(this));
    console.log("local context");
  }

  public getOrLoadDbLibAsync(): Promise<any> {
    return this.owner.getOrLoadDbLibAsync();
  }
  public getOrLoadObjectAsync(object: string, url: string): Promise<any> {
    return this.getOrLoadObjectAsync(object, url);
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
