import IContext from "../../context/IContext";
import Component from "../Component";

export abstract class NonRangeableComponent extends Component<Element> {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }
  protected async getAttributeValueAsync(
    attributeName: string,
    defaultValue: string = null
  ): Promise<string> {
    const token = this.node.GetStringToken(attributeName, this.context);
    return (await token?.getValueAsync()) ?? defaultValue;
  }
  abstract renderAsync(): Promise<void>;
}
