import ISource from "../data/ISource";
import { SourceHandler, SourceId } from "../type-alias";

export default interface IRepository {
  setSource(source: ISource): void;
  addHandler(sourceId: SourceId, handler: SourceHandler): boolean;
  tryToGet(sourceId: SourceId): ISource;
  waitToGetAsync(sourceId: SourceId): Promise<ISource>;
}
