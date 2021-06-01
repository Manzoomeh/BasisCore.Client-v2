import IContext from "../context/IContext";
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
    const token = this.node.GetStringToken(attributeName, this.context);
    return (await token?.getValueAsync()) ?? defaultValue;
  }
}
