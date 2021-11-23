import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import { Priority } from "../../enum";
import ComponentCollection from "../../ComponentCollection";
import CommandComponent from "../CommandComponent";
import { HttpMethod } from "../../type-alias";
import IBCUtil from "../../wrapper/IBCUtil";
import IToken from "../../token/IToken";

declare const $bc: IBCUtil;

@injectable()
export default class CallComponent extends CommandComponent {
  private defaultAttributeNames = ["core", "run", "file", "method"];
  private readonly container: DependencyContainer;
  readonly priority: Priority = Priority.high;
  private collection: ComponentCollection;
  private urlToken: IToken<string>;
  private fileToken: IToken<string>;
  private pageSizeToken: IToken<string>;
  private methodeToken: IToken<string>;
  private contentToken: IToken<string>;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context);
    this.container = container;
  }

  override initializeAsync(): Promise<void> {
    this.urlToken = this.getAttributeToken("url");
    this.pageSizeToken = this.getAttributeToken("pagesize");
    this.methodeToken = this.getAttributeToken("method");
    this.fileToken = this.getAttributeToken("file");
    this.contentToken = this.node.outerHTML.ToStringToken(this.context);
    return super.initializeAsync();
  }

  protected async runAsync(): Promise<void> {
    const filename = await this.fileToken?.getValueAsync();
    const pageSize = await this.pageSizeToken?.getValueAsync();
    const command = await this.contentToken?.getValueAsync();
    const methodValue = await this.methodeToken?.getValueAsync();
    const url = await this.urlToken?.getValueAsync();
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
      method,
      url
    );
    const content = $bc.util.toNode(result);
    const childNodes = [...content.childNodes];
    this.range.setContent(content);
    this.collection = this.container.resolve(ComponentCollection);
    await this.collection.processNodesAsync(childNodes);
  }

  public async disposeAsync(): Promise<void> {
    await this.collection?.disposeAsync();
    return super.disposeAsync();
  }
}
