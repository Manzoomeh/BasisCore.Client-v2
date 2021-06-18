import IContext from "../context/IContext";
import ISource from "../data/ISource";

export default interface ISourceWrapper {
  sortAsync(source: ISource, context: IContext, sort: string): Promise<ISource>;

  runSqlAsync(
    source: ISource,
    context: IContext,
    sql: string
  ): Promise<ISource>;
}
