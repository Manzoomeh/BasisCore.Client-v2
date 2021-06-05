import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import { Priority } from "../../enum";
import ComponentCollection from "../../ComponentCollection";
import CommandComponent from "../CommandComponent";

@injectable()
export default class CallComponent extends CommandComponent {
  readonly range: Range;
  private readonly container: DependencyContainer;
  readonly priority: Priority = Priority.higher;

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

  protected async runAsync(): Promise<void> {
    console.log(this.busy);
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
    const collection = this.container.resolve(ComponentCollection);
    await collection.processNodesAsync(childNodes);
  }
}
