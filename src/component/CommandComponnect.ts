import Command from "../command/Command";
import IContext from "../context/IContext";
import RangeableComponent from "./RangeableComponent";

export default abstract class CommandContainerComponnect<
  TCommand extends Command
> extends RangeableComponent<Element> {
  protected command: TCommand;
  constructor(node: Element, context: IContext) {
    super(node, context);
  }

  get core(): string {
    return this.node.getAttribute("core");
  }

  async canRenderCommandAsync(): Promise<boolean> {
    var token = this.node.GetBooleanToken("if");
    var value = await token?.getValueAsync(this.context);
    return value ?? true;
  }
}
