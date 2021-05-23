import IDataSource from "../data/IDataSource";
import { EventHandler } from "../event/EventHandler";
import { SourceHandler, SourceId } from "../type-alias";

export default interface IRepository {
  setSource(source: IDataSource): void;
  addHandler(sourceId: SourceId, handler: SourceHandler): boolean;
  get(sourceId: SourceId): IDataSource;
}
