import IComponent from "../component/IComponent";
import "./BasisCoreTag";

export default class RangeObject {
  private readonly _startNode: Node;
  private readonly _endNode: Node;
  public readonly initialContent: DocumentFragment;

  constructor(range: Range, owner: IComponent) {
    this._startNode = document.createTextNode("");
    this._endNode = document.createTextNode("");
    this.initialContent = range.extractContents();
    range.insertNode(this._endNode);
    range.insertNode(this._startNode);
    range.detach();
  }

  private getRange(): Range {
    const range = new Range();
    range.setStartAfter(this._startNode);
    range.setEndBefore(this._endNode);
    return range;
  }

  public deleteContents(): void {
    const range = this.getRange();
    range.deleteContents();
    range.detach();
  }

  public setContent(content: any | Node, append: boolean = false) {
    const range = this.getRange();
    if (!append) {
      range.deleteContents();
    }
    const oldContent = range.extractContents();
    if (content instanceof Node) {
      oldContent.appendChild(content);
    } else if (Array.isArray(content)) {
      oldContent.appendChild(range.createContextualFragment((content as Array<any>).join(",")));
    } else {
      oldContent.appendChild(range.createContextualFragment(content.toString()));
    }
    range.insertNode(oldContent);
    range.detach();
  }
}
