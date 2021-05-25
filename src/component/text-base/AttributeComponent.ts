import IContext from "../../context/IContext";
import IDataSource from "../../data/IDataSource";
import IToken from "../../token/IToken";
import Component from "../Component";

export class AttributeComponent extends Component<Element> {
  readonly Attribute: Attr;
  readonly token: IToken<string>;
  private readonly initializeTask: Promise<void>;
  constructor(element: Element, context: IContext, attribute: Attr) {
    super(element, context);
    this.Attribute = attribute;
    this.token = this.Attribute.value.ToStringToken(context);
    this.addTrigger(this.token.getSourceNames());
    this.initializeTask = this.token
      .getValueAsync(false)
      .then((defaultVal) => this.render(defaultVal ?? ""));
  }

  protected onTrigger(): void {
    this.token.getValueAsync().then((x) => {
      this.render(x);
    });
  }

  public initializeAsync(): Promise<void> {
    return this.initializeTask;
  }

  render(content: string): void {
    this.Attribute.value = content;
  }
}
