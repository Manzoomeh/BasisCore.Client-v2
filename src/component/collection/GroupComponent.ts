import { injectable, inject } from "tsyringe";
import IContext from "../../context/IContext";
import { NonSourceBaseComponent } from "../NonSourceBaseComponent";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class GroupComponent extends NonSourceBaseComponent {
  private collection: ComponentCollection;
  private observer: MutationObserver;
  protected runAsync(): Promise<void> {
    return this.collection.runAsync();
  }
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
    console.log("gg", this.range, this.content);
    const config = { attributes: true, childList: true, subtree: true };
    this.observer = new MutationObserver(() => {
      console.log("t");
      this.setContentEx(this.content);
    });
    this.observer.observe(this.content, config);
    this.collection = new ComponentCollection(
      Array.from(this.content.firstChild.childNodes),
      this.context
    );

    //this.collection.runAsync().then((x) => this.setContentEx(this.content));
  }
  private async setContentEx(content: DocumentFragment) {
    this.range.deleteContents();
    this.range.insertNode(content.cloneNode(true));
  }
}
