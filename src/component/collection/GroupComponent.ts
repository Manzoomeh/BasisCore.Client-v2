import { injectable, inject } from "tsyringe";
import IContext from "../../context/IContext";
import Component from "../Component";
import { NonSourceBaseComponent } from "../NonSourceBaseComponent";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class GroupComponent extends Component<Element> {
  private collection: ComponentCollection;
  private observer: MutationObserver;
  readonly range: Range;
  readonly content: DocumentFragment;
  protected runAsync(): Promise<void> {
    return this.collection.runAsync();
  }
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);

    this.content = document.createDocumentFragment();
    while (element.hasChildNodes()) {
      this.content.appendChild(element.firstChild);
    }
    this.range = document.createRange();
    this.range.selectNode(element);

    console.log("gg", this.content);
    const config = { attributes: true, childList: true, subtree: true };
    this.observer = new MutationObserver(() => {
      console.log("t");
      this.setContentEx(this.content);
    });
    this.observer.observe(this.content, config);
    this.collection = new ComponentCollection(
      Array.from(this.content.childNodes),
      this.context
    );

    //this.collection.runAsync().then((x) => this.setContentEx(this.content));
  }
  private async setContentEx(content: DocumentFragment) {
    this.range.deleteContents();
    this.range.insertNode(content.cloneNode(true));
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
