import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import IToken from "../../token/IToken";
import Component from "../Component";
import { ElementBaseComponent } from "../ElementBaseComponent";

export class AttributeComponent extends Component<Element> {
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

  public async renderAsync(source?: ISource): Promise<void> {
    const content = await this.token.getValueAsync();
    this.setContent(content);
  }

  private setContent(content: string): void {
    this.attribute.value = content;
  }
}
