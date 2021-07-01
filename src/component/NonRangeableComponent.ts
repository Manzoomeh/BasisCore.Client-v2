import IContext from "../context/IContext";
import IToken from "../token/IToken";
import Component from "./Component";

export abstract class NonRangeableComponent<
  TElement extends Element
> extends Component<TElement> {
  constructor(element: TElement, context: IContext) {
    super(element, context);
  }

  protected async getAttributeValueAsync(
    attributeName: string,
    defaultValue: string = null
  ): Promise<string> {
    const token = this.getAttributeToken(attributeName);
    return (await token?.getValueAsync()) ?? defaultValue;
  }

  protected async getAttributeBooleanValueAsync(
    attributeName: string,
    defaultValue: boolean = false
  ): Promise<Boolean> {
    const token = this.node.GetBooleanToken(attributeName, this.context);
    return (await token?.getValueAsync()) ?? defaultValue;
  }

  protected getAttributeToken(attributeName: string): IToken<string> {
    return this.node.GetStringToken(attributeName, this.context);
  }
}
