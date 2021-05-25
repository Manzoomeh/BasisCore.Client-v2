import { injectable, inject } from "tsyringe";
import IContext from "../../context/IContext";
import { NonSourceBaseComponent } from "../NonSourceBaseComponent";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class GroupComponent extends NonSourceBaseComponent {
  private collection: ComponentCollection;
  private readonly initializeTask: Promise<void>;
  readonly range: Range;
  readonly content: DocumentFragment;

  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
    this.content = document.createDocumentFragment();
    const childList = new Array<ChildNode>();
    while (element.hasChildNodes()) {
      var child = this.content.appendChild(element.firstChild);
      childList.push(child);
    }
    this.range = document.createRange();
    this.range.selectNode(element);
    this.range.extractContents();
    this.range.insertNode(this.content);
    this.collection = new ComponentCollection(childList, this.context);
    this.initializeTask = this.collection.initializeAsync();
  }

  public runAsync(): Promise<void> {
    return this.collection.runAsync();
  }
  public initializeAsync(): Promise<void> {
    return this.initializeTask;
  }
}
