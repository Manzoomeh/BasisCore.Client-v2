import IContext from "../context/IContext";
import CommandComponent from "./CommandComponent";

export default abstract class NonSourceBaseComponent extends CommandComponent {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }
}
