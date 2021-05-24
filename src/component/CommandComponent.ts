import IContext from "../context/IContext";
import RangeableComponent from "./RangeableComponent";

export default abstract class CommandComponent extends RangeableComponent<Element> {
  public readonly core: string;
  public readonly TriggerBase: boolean = false;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.core = this.node.getAttribute("core");
    const keys = this.node.getAttribute("data-trigger-on")?.split(" ");
    if (keys) {
      this.addTrigger(keys);
      this.TriggerBase = true;
    }
  }

  protected async canRenderCommandAsync(context: IContext): Promise<boolean> {
    const token = this.node.GetBooleanToken("if", context);
    const value = await token?.getValueAsync();
    return value ?? true;
  }

  protected async getAttributeValueAsync(
    attributeName: string,
    defaultValue: string = null
  ): Promise<string> {
    const token = this.node.GetStringToken(attributeName, this.context);
    return (await token?.getValueAsync()) ?? defaultValue;
  }
}
