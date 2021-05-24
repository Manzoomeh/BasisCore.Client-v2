import IDataSource from "../data/IDataSource";
import { SourceHandler, SourceId } from "../type-alias";

export default interface IRepository {
  setSource(source: IDataSource): void;
  addHandler(sourceId: SourceId, handler: SourceHandler): boolean;
  tryToGet(sourceId: SourceId): IDataSource;
  waitToGetAsync(sourceId: SourceId): Promise<IDataSource>;
}
