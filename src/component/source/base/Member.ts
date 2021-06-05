import IContext from "../../../context/IContext";
import Source from "../../../data/Source";
import DataUtil from "../../../data/DataUtil";
import IData from "../../../data/IData";
import IBasisCore from "../../../IBasisCore";
import IDictionary from "../../../IDictionary";
import IToken from "../../../token/IToken";
import { SourceId } from "../../../type-alias";
import Util from "../../../Util";
import { AppendType } from "../../../enum";

declare var $bc: IBasisCore;

export default abstract class Member {
  readonly name: string;
  readonly preview: IToken<boolean>;
  readonly sort: IToken<string>;
  readonly postSql: IToken<string>;
  readonly extraAttributes: IDictionary<IToken<string>>;
  readonly rawContent: IToken<string>;
  readonly element: Element;
  readonly context: IContext;

  constructor(element: Element, context: IContext) {
    this.context = context;
    this.element = element;
    this.name = element.getAttribute("name");
    this.preview = element.GetBooleanToken("preview", context);
    this.sort = element.GetStringToken("sort", context);
    this.postSql = element.GetStringToken("postsql", context);
    this.rawContent = element.textContent.ToStringToken(context);
  }

  public async addDataSourceAsync(data: IData, sourceId: SourceId) {
    var postSqlTask = this.postSql?.getValueAsync();
    var sortTask = this.sort?.getValueAsync();
    var previewTask = this.preview?.getValueAsync();
    data.id = `${sourceId}.${this.name}`.toLowerCase();

    const preview = await previewTask;
    const sort = await sortTask;
    const postSql = await postSqlTask;

    var lib: any;
    if (postSql) {
      if (!Util.HasValue(lib)) {
        lib = await this.context.getOrLoadDbLibAsync();
      }
      data.rows = lib(Util.ReplaceEx(postSql, `\\[${data.id}\\]`, "?"), [
        data.rows,
      ]);
    }
    if (sort) {
      if (!Util.HasValue(lib)) {
        lib = await this.context.getOrLoadDbLibAsync();
      }
      data.rows = lib(`SELECT * FROM ? order by ${sort}`, [data.rows]);
    }
    DataUtil.addRowNumber(data);
    const source = new Source(data, AppendType.replace);
    this.context.setSource(source);

    // if (preview || context.DebugContext.InDebugMode) {
    //   context.AddPreview(source);
    // }
  }
}
