import IContext from "../context/IContext";
import RangeableComponent from "./RangeableComponent";

export default abstract class CommandComponnect extends RangeableComponent<Element> {
  //readonly Element
  constructor(node: Element, context: IContext) {
    super(node, context);
    console.log("r");
  }

  get Core(): string {
    return this.node.getAttribute("core");
  }
}
