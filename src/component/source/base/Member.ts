import IContext from "../../../context/IContext";
import Source from "../../../data/Source";
import DataUtil from "../../../data/DataUtil";
import IBasisCore from "../../../IBasisCore";
import IDictionary from "../../../IDictionary";
import IToken from "../../../token/IToken";
import { SourceId } from "../../../type-alias";
import Util from "../../../Util";
import ISourceOptions from "../../../context/ISourceOptions";

declare var $bc: IBasisCore;

export default abstract class Member {
  readonly name: string;
  readonly previewToken: IToken<boolean>;
  readonly sortToken: IToken<string>;
  readonly postSqlToken: IToken<string>;
  readonly extraAttributes: IDictionary<IToken<string>>;
  readonly rawContentToken: IToken<string>;
  readonly element: Element;
  readonly context: IContext;

  constructor(element: Element, context: IContext) {
    this.context = context;
    this.element = element;
    this.name = element.getAttribute("name");
    this.previewToken = element.GetBooleanToken("preview", context);
    this.sortToken = element.GetStringToken("sort", context);
    this.postSqlToken = element.GetStringToken("postsql", context);
    this.rawContentToken = element.textContent.ToStringToken(context);
  }

  public async addDataSourceAsync(
    data: Array<any>,
    sourceId: SourceId,
    options?: ISourceOptions
  ) {
    var postSqlTask = this.postSqlToken?.getValueAsync();
    var sortTask = this.sortToken?.getValueAsync();
    var previewTask = this.previewToken?.getValueAsync();
    const id = `${sourceId}.${this.name}`.toLowerCase();

    const preview = await previewTask;
    const sort = await sortTask;
    const postSql = await postSqlTask;

    var lib: any;
    if (postSql) {
      if (!Util.HasValue(lib)) {
        lib = await this.context.getOrLoadDbLibAsync();
      }
      data = lib(Util.ReplaceEx(postSql, `\\[${id}\\]`, "?"), [data]);
    }
    if (sort) {
      if (!Util.HasValue(lib)) {
        lib = await this.context.getOrLoadDbLibAsync();
      }
      data = lib(`SELECT * FROM ? order by ${sort}`, [data]);
    }
    DataUtil.addRowNumber(data);
    const source = new Source(id, data, options);
    this.context.setSource(source, preview);
  }
}
