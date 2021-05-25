import { inject, injectable } from "tsyringe";
import IDataSource from "../data/IDataSource";
import IContextRepository from "../repository/IContextRepository";
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
    owner.OnDataSourceAdded.Add(this.onDataSourceAddedHandler.bind(this));
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
}
