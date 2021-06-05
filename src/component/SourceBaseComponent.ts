import { DependencyContainer } from "tsyringe";
import IContext from "../context/IContext";
import ISource from "../data/ISource";
import { AppendType } from "../enum";
import { SourceId } from "../type-alias";
import CommandComponent from "./CommandComponent";

export default abstract class SourceBaseComponent extends CommandComponent {
  private sourceId: SourceId;
  readonly range: Range;
  readonly content: DocumentFragment;
  readonly container: DependencyContainer;
  private _dataSource: ISource;
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
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    this.sourceId = await this.getAttributeValueAsync("datamembername");
    this.context.addOnSourceSetHandler(
      this.sourceId,
      this.onDataSourceAdded.bind(this)
    );
    console.log(`${this.core} - initializeAsync`);
  }

  protected abstract renderSourceAsync(dataSource: ISource): Promise<Node>;

  public async runAsync(): Promise<void> {
    let source = this._dataSource;
    this._dataSource = null;
    if (!source) {
      source = await this.context.waitToGetSourceAsync(this.sourceId);
    }
    console.log(`${this.core} - runAsync`);
    const renderResult = await this.renderSourceAsync(source);
    if (renderResult) {
      this.setContent(renderResult, source.appendType);
    }
  }

  private onDataSourceAdded(dataSource: ISource): void {
    this._dataSource = dataSource;
    this.processAsync();
  }

  protected async setContent(
    newContent: Node,
    appendType: AppendType = AppendType.replace
  ) {
    switch (appendType) {
      case AppendType.after: {
        const currentContent = this.range.extractContents();
        currentContent.appendChild(newContent);
        this.range.insertNode(currentContent);
        break;
      }
      case AppendType.before: {
        this.range.insertNode(newContent);
        break;
      }
      default: {
        this.range.deleteContents();
        this.range.insertNode(newContent);
        break;
      }
    }
  }
}
