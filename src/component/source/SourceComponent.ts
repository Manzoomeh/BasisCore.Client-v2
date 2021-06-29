import IContext from "../../context/IContext";
import { Priority } from "../../enum";
import CommandComponent from "../CommandComponent";

export default abstract class SourceComponent extends CommandComponent {
  readonly range: Range;
  readonly priority: Priority = Priority.high;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.range = new Range();
    this.range.selectNode(element);
    this.range.extractContents();
  }
}
