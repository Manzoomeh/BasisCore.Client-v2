import IContext from "../../context/IContext";
import IToken from "../../token/IToken";
import { NonRangeableComponent } from "../NonRangeableComponent";

export class AttributeComponent extends NonRangeableComponent<Element> {
  readonly attribute: Attr;
  readonly token: IToken<string>;
  private readonly initializeTask: Promise<void>;
  constructor(element: Element, context: IContext, attribute: Attr) {
    super(element, context);
    this.attribute = attribute;
    this.token = this.attribute.value.ToStringToken(context);
    this.addTrigger(this.token.getSourceNames());
    this.initializeTask = this.token
      .getValueAsync(false)
      .then((defaultVal) => this.render(defaultVal ?? ""));
  }

  public initializeAsync(): Promise<void> {
    return this.initializeTask;
  }

  public async renderAsync(fromTrigger: boolean): Promise<void> {
    const content = await this.token.getValueAsync();
    this.render(content);
  }

  render(content: string): void {
    this.attribute.value = content;
  }
}
