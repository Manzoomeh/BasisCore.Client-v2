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
    this.range.deleteContents();
  }
  public initializeAsync(): Promise<void> {
    return Promise.resolve();
  }

  protected async runAsync(): Promise<void> {
    const filename = await this.getAttributeValueAsync("file");
    const pagesize = await this.getAttributeValueAsync("pagesize");
    const command = await this.node.outerHTML
      .ToStringToken(this.context)
      .getValueAsync();

    const result = await this.context.loadPageAsync(
      filename,
      command,
      pagesize,
      0
    );

    const content = this.range.createContextualFragment(result);
    const childNodes = [...content.childNodes];
    this.range.deleteContents();
    this.range.insertNode(content);
    const collection = new ComponentCollection(childNodes, this.context);
    await collection.initializeAsync();
    await collection.runAsync();
  }
}
