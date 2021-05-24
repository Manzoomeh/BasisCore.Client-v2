import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import CommandComponnect from "./CommandComponent";

export default abstract class SourceBaseComponent extends CommandComponnect {
  constructor(element: Element, context: IContext) {
    super(element, context);
    this.getAttributeValueAsync("datamembername").then((x) => {
      var source = this.context.repository.tryToGet(x);
      this.context.repository.addHandler(x, this.onDataSourceAdded.bind(this));
      if (source) {
        this.onDataSourceAdded(source);
      }
    });
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
