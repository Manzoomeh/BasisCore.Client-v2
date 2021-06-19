import IContext from "../context/IContext";
import ISource from "../data/ISource";

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
}
