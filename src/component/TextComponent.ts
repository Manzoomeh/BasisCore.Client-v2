import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import IToken from "../token/IToken";
import RangeableComponent from "./RangeableComponent";

export default class TextComponent extends RangeableComponent<Node> {
  readonly token: IToken<string>;
  readonly relatedSource: Array<string>;

  constructor(node: Node, context: IContext, start: number, end: number) {
    super(node, context, start, end);
    this.token = this.content.textContent.ToStringToken(context);
    this.relatedSource = this.token.getSourceNames();
    this.token
      .getValueAsync(false)
      .then((defaultVal) => this.applyResult(defaultVal ?? ""));
  }

  onDataSourceAdded(dataSource: IDataSource): void {
    if (this.relatedSource.indexOf(dataSource.data.Name) != -1) {
      this.token.getValueAsync().then((x) => {
        this.applyResult(x);
      });
    }
  }
}
