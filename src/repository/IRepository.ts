import ISource from "../data/ISource";
import { SourceHandler, SourceId } from "../type-alias";

export default interface IRepository {
  setSource(source: ISource, preview?: boolean): void;
  addHandler(sourceId: SourceId, handler: SourceHandler): boolean;
  tryToGet(sourceId: SourceId): ISource;
  waitToGetAsync(sourceId: SourceId): Promise<ISource>;
}
