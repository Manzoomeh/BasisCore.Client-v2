import { injectable, inject } from "tsyringe";
import IContext from "../../context/IContext";
import Component from "../Component";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class GroupComponent extends Component<Node> {
  private collection: ComponentCollection;
  private readonly initializeTask: Promise<void>;
  readonly range: Range;
  readonly content: DocumentFragment;
  protected renderAsync(): Promise<void> {
    return this.collection.runAsync();
  }
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
    console.log("group", element);
    this.content = document.createDocumentFragment();
    const childList = new Array<ChildNode>();
    while (element.hasChildNodes()) {
      var t = this.content.appendChild(element.firstChild);
      childList.push(t);
    }
    this.range = document.createRange();
    this.range.selectNode(element);
    this.range.extractContents();
    this.range.insertNode(this.content);
    console.log("group elements", childList);
    this.collection = new ComponentCollection(childList, this.context);
    this.initializeTask = this.collection.initializeAsync();
  }

  public initializeAsync(): Promise<void> {
    return this.initializeTask;
  }
}

// export default class GroupComponent extends NonSourceBaseComponent {
//   private collection: ComponentCollection;
//   private observer: MutationObserver;
//   protected runAsync(): Promise<void> {
//     return this.collection.runAsync();
//   }
//   constructor(element: Element, @inject("IContext") context: IContext) {
//     super(element, context);
//     console.log("gg", this.content.firstChild);
//     const config = { attributes: true, childList: true, subtree: true };
//     this.observer = new MutationObserver(() => {
//       console.log("t");
//       this.setContentEx(this.content);
//     });
//     this.observer.observe(this.content.firstChild, config);
//     this.collection = new ComponentCollection(
//       Array.from(this.content.firstChild.childNodes),
//       this.context
//     );

//     //this.collection.runAsync().then((x) => this.setContentEx(this.content));
//   }
//   private async setContentEx(content: DocumentFragment) {
//     this.range.deleteContents();
//     this.range.insertNode(content.firstChild.cloneNode(true));
//   }
// }
