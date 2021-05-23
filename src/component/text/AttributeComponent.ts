import IContext from "../../context/IContext";
import IDataSource from "../../data/IDataSource";
import IToken from "../../token/IToken";
import Component from "../Component";

export class AttributeComponent extends Component<Element> {
  readonly Attribute: Attr;
  readonly token: IToken<string>;
  constructor(element: Element, context: IContext, attribute: Attr) {
    super(element, context);
    this.Attribute = attribute;
    this.token = this.Attribute.value.ToStringToken(context);
    this.addDataSourceToWatchList(this.token.getSourceNames());
    this.token
      .getValueAsync(false)
      .then((defaultVal) => this.render(defaultVal ?? ""));
  }

  onDataSourceAdded(dataSource: IDataSource): void {
    this.token.getValueAsync().then((x) => {
      this.render(x);
    });
  }

  render(content: string): void {
    this.Attribute.value = content;
  }
}
