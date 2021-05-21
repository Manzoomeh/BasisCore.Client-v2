import IContext from "../context/IContext";
import RangeableComponent from "./RangeableComponent";

export default abstract class CommandComponnect extends RangeableComponent {
  constructor(node: Element, context: IContext) {
    super(node, context);
  }
}
