import ISource from "../data/ISource";
import { SourceHandler, SourceId } from "../type-alias";

export default interface IRepository {
  setSource(source: ISource, preview?: boolean): ISource;
  addHandler(sourceId: SourceId, handler: SourceHandler): void;
  removeHandler(sourceId: SourceId, handler: SourceHandler): void;
  tryToGet(sourceId: SourceId): ISource;
  waitToGetAsync(sourceId: SourceId): Promise<ISource>;
}
