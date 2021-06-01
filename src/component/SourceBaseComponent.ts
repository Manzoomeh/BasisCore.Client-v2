import { DependencyContainer } from "tsyringe";
import IContext from "../context/IContext";
import ISource from "../data/ISource";
import { SourceId } from "../type-alias";
import CommandComponent from "./CommandComponent";

export default abstract class SourceBaseComponent extends CommandComponent {
  private readonly initializeTask: Promise<void>;
  private sourceId: SourceId;
  readonly range: Range;
  readonly content: DocumentFragment;
  readonly container: DependencyContainer;
  constructor(
    element: Element,
    context: IContext,
    container: DependencyContainer
  ) {
    super(element, context);
    this.container = container;
    this.range = document.createRange();
    this.range.selectNode(element);
    this.content = this.range.extractContents();
    this.initializeTask = this.addDataHandler();
  }

  private async addDataHandler(): Promise<void> {
    this.sourceId = await this.getAttributeValueAsync("datamembername");
    var source = this.context.tryToGetSource(this.sourceId);
    this.context.addOnSourceSetHandler(
      this.sourceId,
      this.onDataSourceAdded.bind(this)
    );
    if (source) {
      this.onDataSourceAdded(source);
    }
  }

  public initializeAsync(): Promise<void> {
    return this.initializeTask;
  }

  protected abstract renderSourceAsync(dataSource: ISource): Promise<Node>;

  public async renderAsync(fromTrigger: boolean): Promise<void> {
    var source = await this.context.waitToGetSourceAsync(this.sourceId);
    this.onDataSourceAdded(source);
  }

  private onDataSourceAdded(dataSource: ISource): void {
    this.getCanRenderAsync(this.context).then((x) => {
      if (x) {
        this.renderSourceAsync(dataSource).then((renderResult) => {
          if (renderResult) {
            this.setContent(renderResult, dataSource.replace);
          }
        });
      }
    });
  }

  protected async setContent(newContent: Node, replace: boolean = true) {
    if (replace) {
      this.range.deleteContents();
      this.range.insertNode(newContent);
    } else {
      const currentContent = this.range.extractContents();
      currentContent.appendChild(newContent);
      this.range.insertNode(currentContent);
    }
  }
}
