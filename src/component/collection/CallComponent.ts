import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import NonSourceBaseComponent from "../NonSourceBaseComponent";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class CallComponent extends NonSourceBaseComponent {
  readonly range: Range;
  private readonly container: DependencyContainer;
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context);
    this.container = container;
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
    const childContainer = this.container.createChildContainer();
    childContainer.register("nodes", { useValue: childNodes });
    childContainer.register("context", { useValue: this.context });
    childContainer.register("container", { useValue: childContainer });
    const collection = childContainer.resolve(ComponentCollection);
    await collection.initializeAsync();
    await collection.runAsync();
  }
}
