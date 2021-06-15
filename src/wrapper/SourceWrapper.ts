import IContext from "../context/IContext";
import ISource from "../data/ISource";
import Source from "../data/Source";
import { MergeType } from "../enum";
import { SourceId } from "../type-alias";
import Util from "../Util";

export class SourceWrapper {
  public new(sourceId: SourceId, data: any, mergeType?: MergeType): ISource {
    return new Source(sourceId, data, mergeType);
  }

  public async sortAsync(
    source: ISource,
    context: IContext,
    sort: string
  ): Promise<ISource> {
    const lib = await context.getOrLoadDbLibAsync();
    return new Source(
      source.id,
      lib(`SELECT * FROM ? order by ${sort}`, [source.rows]),
      source.mergeType
    );
  }

  public async runSqlAsync(
    source: ISource,
    context: IContext,
    sql: string
  ): Promise<ISource> {
    const lib = await context.getOrLoadDbLibAsync();
    return new Source(
      source.id,
      lib(Util.ReplaceEx(sql, `\\[${source.id}\\]`, "?"), [source.rows]),
      source.mergeType
    );
  }
}
