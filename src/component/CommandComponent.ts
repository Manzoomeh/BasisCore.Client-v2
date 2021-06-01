import IContext from "../context/IContext";
import { NonRangeableComponent } from "./NonRangeableComponent";

export default abstract class CommandComponent extends NonRangeableComponent<Element> {
  public readonly core: string;
  public readonly TriggerBase: boolean = false;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.core = this.node.getAttribute("core");
    const keys = this.node.getAttribute("bc-trigger-on")?.split(" ");
    if (keys) {
      this.addTrigger(keys);
      this.TriggerBase = true;
    }
  }

  protected async getCanRenderAsync(context: IContext): Promise<boolean> {
    const token = this.node.GetBooleanToken("if", context);
    const value = await token?.getValueAsync();
    return value ?? true;
  }
}
