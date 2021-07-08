import IContext from "../context/IContext";
import { ElementBaseComponent } from "./ElementBaseComponent";

export default abstract class CommandComponent extends ElementBaseComponent<Element> {
  public readonly core: string;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.core = this.node.getAttribute("core");
  }
}
