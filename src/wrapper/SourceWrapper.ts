import IContext from "../context/IContext";
import DataUtil from "../data/DataUtil";
import ISource from "../data/ISource";
import { MergeType } from "../enum";
import { SourceId } from "../type-alias";
import Util from "../Util";

export class SourceWrapper {
  public new(sourceId: SourceId, data: any, mergeType?: MergeType): ISource {
    return DataUtil.ToDataSource(sourceId, data, mergeType);
  }

  public async sortAsync(
    source: ISource,
    context: IContext,
    sort: string
  ): Promise<ISource> {
    const lib = await context.getOrLoadDbLibAsync();
    return DataUtil.ToDataSource(
      source.data.id,
      lib(`SELECT * FROM ? order by ${sort}`, [source.data.rows]),
      source.mergeType
    );
  }

  public async runSqlAsync(source: ISource, context: IContext, sql: string) {
    const lib = await context.getOrLoadDbLibAsync();
    return DataUtil.ToDataSource(
      source.data.id,
      lib(Util.ReplaceEx(sql, `\\[${source.data.id}\\]`, "?"), [
        source.data.rows,
      ]),
      source.mergeType
    );
  }
}
