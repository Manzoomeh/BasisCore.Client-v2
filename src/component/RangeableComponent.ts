import IContext from "../context/IContext";
import Component from "./Component";

export default abstract class RangeableComponent<
  TNode extends Node
> extends Component<TNode> {
  readonly range: Range;

  constructor(node: TNode, context: IContext, start: number, end: number) {
    super(node, context);
    this.range = document.createRange();

    this.range.setStart(node, start);
    this.range.setEnd(node, end);
  }
}
