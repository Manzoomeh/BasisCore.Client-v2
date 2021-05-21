import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import IToken from "../token/IToken";
import Util from "../Util";
import RangeableComponent from "./RangeableComponent";

export default class TextComponent extends RangeableComponent {
  readonly token: IToken<string>;
  readonly relatedSource: Array<string>;

  constructor(node: Node, context: IContext, start: number, end: number) {
    super(node, context, start, end);
    this.token = this.content.textContent.ToStringToken();
    this.relatedSource = this.token.getSourceNames();
    this.token
      .getValueAsync(context, false)
      .then((defaultVal) => this.render(defaultVal ?? ""));
    // var defaultVal = this.token.getDefault();
    // if (Util.HasValue(defaultVal)) {
    //   this.render(defaultVal);
    // }
  }

  onDataSourceAdded(dataSource: IDataSource): void {
    if (this.relatedSource.indexOf(dataSource.Data.Name) != -1) {
      this.token.getValueAsync(this.context).then((x) => {
        this.render(x);
      });
    }
  }
}
