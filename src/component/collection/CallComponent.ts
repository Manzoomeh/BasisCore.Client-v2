import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import { NonSourceBaseComponent } from "../NonSourceBaseComponent";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class CallComponent extends NonSourceBaseComponent {
  private collection: ComponentCollection;
  private loadedFragment: DocumentFragment;
  private observer: MutationObserver;
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
  }

  protected async runAsync(): Promise<void> {
    var filename = await this.getAttributeValueAsync("file");
    var pagesize = await this.getAttributeValueAsync("pagesize");
    var commnad = await this.node.outerHTML
      .ToStringToken(this.context)
      .getValueAsync();

    var result = await this.context.loadPageAsync(
      filename,
      commnad,
      pagesize,
      0
    );
    this.observer?.disconnect();
    this.loadedFragment = this.range.createContextualFragment(result);
    this.collection = new ComponentCollection(
      Array.from(this.loadedFragment.childNodes),
      this.context
    );

    //https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    const config = { attributes: true, childList: true, subtree: true };
    this.observer = new MutationObserver(() =>
      this.setContentEx(this.loadedFragment)
    );
    this.observer.observe(this.loadedFragment, config);

    await this.collection.runAsync();
    this.setContentEx(this.loadedFragment);
  }

  private async setContentEx(content: DocumentFragment) {
    this.range.deleteContents();
    this.range.insertNode(content.cloneNode(true));
  }
}
