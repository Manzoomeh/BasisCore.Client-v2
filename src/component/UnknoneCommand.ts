import IContext from "../context/IContext";
import CommandComponnect from "./CommandComponnect";

export default class UnknoneCommand extends CommandComponnect {
  constructor(node: Element, context: IContext) {
    super(node, context);
  }
}
