import IComponent from "../component/IComponent";
import IBasisCoreTag from "./IBasisCoreTag";
import "./BasisCoreTag";

export default class RangeObject {
  readonly element: IBasisCoreTag;
  constructor(range: Range, owner: IComponent) {
    this.element = document.createElement("basis-core") as IBasisCoreTag;
    this.element.setOwner(owner);
    range.surroundContents(this.element);
    range.detach();
  }

  public deleteContents(): void {
    this.element.innerHTML = "";
  }

  public setContent(content: string | number | Node, append: boolean = false) {
    const range = new Range();
    range.selectNodeContents(this.element);
    if (!append) {
      range.deleteContents();
    }
    const oldContent = range.extractContents();
    if (content instanceof Node) {
      oldContent.appendChild(content);
    }
    if (typeof content === "string") {
      oldContent.appendChild(range.createContextualFragment(content));
    }
    if (typeof content === "number") {
      oldContent.appendChild(
        range.createContextualFragment(content.toString())
      );
    }
    range.insertNode(oldContent);
    range.detach();
  }
}
