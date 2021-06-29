import IContext from "../context/IContext";
import Data from "../data/Data";
import ISource from "../data/ISource";
import { MergeType } from "../enum";
import { SourceId } from "../type-alias";

export default interface ISourceWrapper {
  sortAsync(source: ISource, sort: string, context: IContext): Promise<ISource>;

  filterAsync(
    source: ISource,
    filter: string,
    context: IContext
  ): Promise<any[]>;

  isNullOrEmpty(data: string): boolean;

  runSqlAsync(
    source: ISource,
    sql: string,
    context: IContext
  ): Promise<ISource>;

  data(id: SourceId, data: any, mergeType?: MergeType): Data;
}
