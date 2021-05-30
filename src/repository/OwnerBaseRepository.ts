import { inject, injectable } from "tsyringe";
import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import ILogger from "../logger/ILogger";
import { SourceId } from "../type-alias";
import Repository from "./Repository";

@injectable()
export default class OwnerBaseRepository extends Repository {
  owner: IContext;
  constructor(
    @inject("ILogger") logger: ILogger,
    @inject("OwnerContext") owner: IContext
  ) {
    super(logger);
    this.owner = owner;
    console.log("fff");
  }

  public tryToGet(sourceId: SourceId): IDataSource {
    let retVal = super.tryToGet(sourceId);
    if (!retVal) {
      retVal = this.owner.repository.tryToGet(sourceId);
    }
    return retVal;
  }
}
