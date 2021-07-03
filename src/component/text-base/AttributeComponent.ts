import IContext from "../../context/IContext";
import IToken from "../../token/IToken";
import { NonRangeableComponent } from "../NonRangeableComponent";

export class AttributeComponent extends NonRangeableComponent<Element> {
  readonly attribute: Attr;
  readonly token: IToken<string>;
  constructor(element: Element, context: IContext, attribute: Attr) {
    super(element, context);
    this.attribute = attribute;
    this.token = this.attribute.value.ToStringToken(context);
    this.addTrigger(this.token.getSourceNames());
  }

  public async initializeAsync(): Promise<void> {
    const value = await this.token.getValueAsync(false);
    this.setContent(value ?? "");
  }

  public async renderAsync(): Promise<void> {
    const content = await this.token.getValueAsync();
    this.setContent(content);
  }

  private setContent(content: string): void {
    this.attribute.value = content;
  }
}
