import IContext from "../context/IContext";
import ElementBaseComponent from "./ElementBaseComponent";

export default abstract class CommandComponent extends ElementBaseComponent<Element> {
  public readonly core: string;
  readonly range: Range;
  readonly content: DocumentFragment;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.core = this.node.getAttribute("core");
    this.range = document.createRange();
    this.range.selectNode(element);
    this.content = this.range.extractContents();
  }
}
