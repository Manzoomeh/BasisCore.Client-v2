import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import ComponentCollection from "./ComponentCollection";
import { NonRangeableComponent } from "./NonRangeableComponent";

@injectable()
export default class CallComponent extends NonRangeableComponent {
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
  }
  public initializeAsync(): Promise<void> {
    return Promise.resolve();
  }

  public async renderAsync(): Promise<void> {
    var filename = await this.getAttributeValueAsync("file");
    var pagesize = await this.getAttributeValueAsync("pagesize");
    var command = await this.node.outerHTML
      .ToStringToken(this.context)
      .getValueAsync();

    var result = await this.context.loadPageAsync(
      filename,
      command,
      pagesize,
      0
    );

    const range = document.createRange();
    const element = range.createContextualFragment(result);

    //this.content = document.createDocumentFragment();
    const content = document.createDocumentFragment();
    const childList = new Array<ChildNode>();
    console.log("el", element);
    while (element.hasChildNodes()) {
      var t = content.appendChild(element.firstChild);
      childList.push(t);
    }

    range.selectNode(this.node);

    range.extractContents();
    range.insertNode(content);
    console.log(`call ${filename}`, childList);
    const collection = new ComponentCollection(childList, this.context);
    await collection.initializeAsync();
    await collection.runAsync();
  }

  // protected async runAsync(): Promise<void> {
  //   var filename = await this.getAttributeValueAsync("file");
  //   var pagesize = await this.getAttributeValueAsync("pagesize");
  //   var command = await this.node.outerHTML
  //     .ToStringToken(this.context)
  //     .getValueAsync();

  //   var result = await this.context.loadPageAsync(
  //     filename,
  //     command,
  //     pagesize,
  //     0
  //   );
  //   this.observer?.disconnect();
  //   this.loadedFragment = this.range.createContextualFragment(result);
  //   this.collection = new ComponentCollection(
  //     Array.from(this.loadedFragment.childNodes),
  //     this.context
  //   );

  //   //https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
  //   const config = { attributes: true, childList: true, subtree: true };
  //   this.observer = new MutationObserver(() =>
  //     this.setContentEx(this.loadedFragment)
  //   );
  //   this.observer.observe(this.loadedFragment, config);

  //   await this.collection.runAsync();
  //   this.setContentEx(this.loadedFragment);
  // }

  // private async setContentEx(content: DocumentFragment) {
  //   this.range.deleteContents();
  //   this.range.insertNode(content.cloneNode(true));
  // }
}
