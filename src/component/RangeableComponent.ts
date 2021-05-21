import IContext from "../context/IContext";
import Component from "./Component";

export default abstract class RangeableComponent extends Component {
  readonly range: Range;
  readonly content: DocumentFragment;

  constructor(
    node: Node,
    context: IContext,
    start: number = -1,
    end: number = -1
  ) {
    super(node, context);

    this.range = document.createRange();
    if (start != -1) {
      this.range.setStart(node, start);
      this.range.setEnd(node, end);
    } else {
      this.range.selectNode(node);
    }
    this.content = this.range.extractContents();
  }

  render(content: string): void {
    const fragment = this.range.createContextualFragment(content);
    this.range.deleteContents();
    this.range.insertNode(fragment);
  }
}
