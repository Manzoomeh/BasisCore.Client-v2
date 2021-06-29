import IContext from "../context/IContext";
import Data from "../data/Data";
import ISource from "../data/ISource";
import Source from "../data/Source";
import { MergeType } from "../enum";
import { SourceId } from "../type-alias";
import Util from "../Util";
import ISourceWrapper from "./ISourceWrapper";

export class SourceWrapper implements ISourceWrapper {
  public new(sourceId: SourceId, data: any, mergeType?: MergeType): ISource {
    return new Source(sourceId, data, mergeType);
  }

  public async sortAsync(
    source: ISource,
    sort: string,
    context: IContext
  ): Promise<ISource> {
    const lib = await context.getOrLoadDbLibAsync();
    return new Source(
      source.id,
      lib(`SELECT * FROM ? order by ${sort}`, [source.rows]),
      source.mergeType
    );
  }

  public async filterAsync(
    source: ISource,
    filter: string,
    context: IContext
  ): Promise<any[]> {
    var retVal: any[];
    if (this.isNullOrEmpty(filter)) {
      retVal = source.rows;
    } else {
      var lib = await context.getOrLoadDbLibAsync();
      retVal = lib(`SELECT * FROM ? [${source.id}] where ${filter}`, [
        source.rows,
      ]);
    }
    return retVal;
  }

  public isNullOrEmpty(data: string): boolean {
    return data === undefined || data == null || data === "";
  }

  public async runSqlAsync(
    source: ISource,
    sql: string,
    context: IContext
  ): Promise<ISource> {
    const lib = await context.getOrLoadDbLibAsync();
    return new Source(
      source.id,
      lib(Util.ReplaceEx(sql, `\\[${source.id}\\]`, "?"), [source.rows]),
      source.mergeType
    );
  }

  public data(id: SourceId, data: any, mergeType?: MergeType): Data {
    return new Data(id, data, mergeType);
  }
}
