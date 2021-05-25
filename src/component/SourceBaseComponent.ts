import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import CommandComponent from "./CommandComponent";

export default abstract class SourceBaseComponent extends CommandComponent {
  private readonly initializeTask: Promise<void>;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.initializeTask = this.addDataHandler();
  }

  private async addDataHandler(): Promise<void> {
    const dataMemberName = await this.getAttributeValueAsync("datamembername");
    var source = this.context.repository.tryToGet(dataMemberName);
    this.context.repository.addHandler(
      dataMemberName,
      this.onDataSourceAdded.bind(this)
    );
    if (source) {
      this.onDataSourceAdded(source);
    }
  }

  public initializeAsync(): Promise<void> {
    return this.initializeTask;
  }

  protected abstract renderAsync(dataSource: IDataSource): Promise<string>;

  private onDataSourceAdded(dataSource: IDataSource): void {
    this.canRenderCommandAsync(this.context).then((x) => {
      if (x) {
        this.renderAsync(dataSource).then((renderResult) => {
          this.setContent(renderResult, dataSource.replace);
        });
      }
    });
  }
}
