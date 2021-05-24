import IContext from "../context/IContext";
import Component from "./Component";

export default abstract class RangeableComponent<
  TNode extends Node
> extends Component<TNode> {
  readonly range: Range;
  readonly content: DocumentFragment;

  constructor(
    node: TNode,
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

  preContent: string = "";
  protected async setContent(content: string, replace: boolean = true) {
    if (replace) {
      this.preContent = "";
    }
    this.preContent += content;
    let fragment = this.range.createContextualFragment(this.preContent);
    this.range.deleteContents();
    this.range.insertNode(fragment);
  }
}
