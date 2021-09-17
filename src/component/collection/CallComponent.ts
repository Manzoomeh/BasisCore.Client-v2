import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import { Priority } from "../../enum";
import ComponentCollection from "../../ComponentCollection";
import CommandComponent from "../CommandComponent";
import { HttpMethod } from "../../type-alias";

@injectable()
export default class CallComponent extends CommandComponent {
  private defaultAttributeNames = ["core", "run", "file", "method"];
  private readonly container: DependencyContainer;
  readonly priority: Priority = Priority.high;
  private collection: ComponentCollection;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context);
    this.container = container;
  }

  protected async runAsync(): Promise<void> {
    const filename = await this.getAttributeValueAsync("file");
    const pageSize = await this.getAttributeValueAsync("pagesize");
    const command = await this.node.outerHTML
      .ToStringToken(this.context)
      .getValueAsync();
    const methodValue = await this.getAttributeValueAsync("method");
    const method = (
      methodValue ?? this.context.options.getDefault<string>("call.verb")
    ).toUpperCase() as HttpMethod;
    let parameters = null;
    if (method === "POST") {
      parameters = {};
      for (let i = 0; i < this.node.attributes.length; i++) {
        const attr = this.node.attributes[i];
        const name = attr.name.toLowerCase();
        if (this.defaultAttributeNames.indexOf(name) == -1) {
          parameters[name] = await this.getAttributeValueAsync(attr.name);
        }
      }
    } else {
      parameters = {
        fileNames: filename,
        dmnid: this.context.options.getDefault("dmnid"),
        siteSize: pageSize,
        command: command,
      };
    }

    const result = await this.context.loadPageAsync(
      filename,
      parameters,
      method
    );
    const content = this.range.createContextualFragment(result);
    const childNodes = [...content.childNodes];
    this.range.deleteContents();
    this.range.insertNode(content);
    this.collection = this.container.resolve(ComponentCollection);
    await this.collection.processNodesAsync(childNodes);
  }

  public async disposeAsync(): Promise<void> {
    await this.collection?.disposeAsync();
    return super.disposeAsync();
  }
}
