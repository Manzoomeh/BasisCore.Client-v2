import { container } from "tsyringe";
import Command from "../command/Command";
import IContext from "../context/IContext";
import RangeableComponent from "./RangeableComponent";

export default abstract class CommandContainerComponent<
  TCommand extends Command
> extends RangeableComponent<Element> {
  readonly command: TCommand;
  public readonly core: string;
  constructor(element: Element, context: IContext) {
    super(element, context);
    this.core = this.node.getAttribute("core");
    const childContainer = container.createChildContainer();
    childContainer.register(Element, { useValue: element });
    this.command = childContainer.resolve<TCommand>(this.core);
    childContainer.reset();
  }

  async canRenderCommandAsync(context: IContext): Promise<boolean> {
    var token = this.node.GetBooleanToken("if", context);
    var value = await token?.getValueAsync(this.context);
    return value ?? true;
  }
}
