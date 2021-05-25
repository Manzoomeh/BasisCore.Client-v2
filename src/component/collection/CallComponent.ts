import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import { NonSourceBaseComponent } from "../NonSourceBaseComponent";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class CallComponent extends NonSourceBaseComponent {
  readonly range: Range;
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
    this.range = document.createRange();
    this.range.selectNode(element);
  }
  public initializeAsync(): Promise<void> {
    return Promise.resolve();
  }

  protected async runAsync(): Promise<void> {
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

    const newContent = this.range.createContextualFragment(result);
    const content = document.createDocumentFragment();
    const childList = new Array<ChildNode>();
    while (newContent.hasChildNodes()) {
      var child = content.appendChild(newContent.firstChild);
      childList.push(child);
    }

    this.range.deleteContents();
    this.range.insertNode(content);
    const collection = new ComponentCollection(childList, this.context);
    await collection.initializeAsync();
    await collection.runAsync();
  }
}
