import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import { SourceId } from "../type-alias";
import CommandComponent from "./CommandComponent";

export default abstract class SourceBaseComponent extends CommandComponent {
  private readonly initializeTask: Promise<void>;
  private sourceId: SourceId;
  readonly range: Range;
  constructor(element: Element, context: IContext) {
    super(element, context);
    this.range = document.createRange();
    this.range.selectNode(element);
    this.initializeTask = this.addDataHandler();
  }

  private async addDataHandler(): Promise<void> {
    this.sourceId = await this.getAttributeValueAsync("datamembername");
    var source = this.context.repository.tryToGet(this.sourceId);
    this.context.repository.addHandler(
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

  protected abstract renderSourceAsync(
    dataSource: IDataSource
  ): Promise<string>;

  public async renderAsync(): Promise<void> {
    var source = await this.context.repository.waitToGetAsync(this.sourceId);
    this.onDataSourceAdded(source);
  }

  private onDataSourceAdded(dataSource: IDataSource): void {
    this.canRenderCommandAsync(this.context).then((x) => {
      if (x) {
        this.renderSourceAsync(dataSource).then((renderResult) => {
          this.setContent(renderResult, dataSource.replace);
        });
      }
    });
  }

  preContent: string = "";
  protected async setContent(content: string, replace: boolean = true) {
    if (replace) {
      this.preContent = "";
    }
    this.preContent += content;
    let fragment = this.range.createContextualFragment(this.preContent);
    this.range.deleteContents();
    this.range.insertNode(fragment);
  }
}
