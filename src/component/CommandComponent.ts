import IContext from "../context/IContext";
import RangeObject from "../RangeObject/RangeObject";
import ElementBaseComponent from "./ElementBaseComponent";

export default abstract class CommandComponent extends ElementBaseComponent<Element> {
  public readonly core: string;
  readonly range: RangeObject;
  readonly content: DocumentFragment;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.core = this.node.getAttribute("core");
    const range = document.createRange();
    range.selectNode(this.node);
    this.range = new RangeObject(range, this);
    this.content = this.range.initialContent;
  }
}
