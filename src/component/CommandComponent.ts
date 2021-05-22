import IContext from "../context/IContext";
import RangeableComponent from "./RangeableComponent";

export default abstract class CommandComponent extends RangeableComponent<Element> {
  public readonly core: string;
  constructor(element: Element, context: IContext) {
    super(element, context);
    this.core = this.node.getAttribute("core");
  }

  async canRenderCommandAsync(context: IContext): Promise<boolean> {
    var token = this.node.GetBooleanToken("if", context);
    var value = await token?.getValueAsync(this.context);
    return value ?? true;
  }

  protected async getAttributeValueAsync(
    attributeName: string,
    context: IContext,
    defaultValue: string = null
  ): Promise<string> {
    var token = this.node.GetStringToken(attributeName, context);
    return (await token?.getValueAsync(context)) ?? defaultValue;
  }
}
