import IContext from "../../context/IContext";
import IDataSource from "../../data/IDataSource";
import IToken from "../../token/IToken";
import RangeableComponent from "../RangeableComponent";

export default class TextComponent extends RangeableComponent<Node> {
  readonly token: IToken<string>;

  constructor(node: Node, context: IContext, start: number, end: number) {
    super(node, context, start, end);
    this.token = this.content.textContent.ToStringToken(context);
    this.addTrigger(this.token.getSourceNames());
    this.token
      .getValueAsync(false)
      .then((defaultVal) => this.setContent(defaultVal ?? ""));
  }

  protected onTrigger(): void {
    this.token.getValueAsync().then((x) => {
      this.setContent(x);
    });
  }
}
