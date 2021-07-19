import IContext from "../../context/IContext";
import { Priority } from "../../enum";
import CommandComponent from "../CommandComponent";

export default abstract class SourceComponent extends CommandComponent {
  readonly priority: Priority = Priority.normal;

  constructor(element: Element, context: IContext) {
    super(element, context);
  }
}
