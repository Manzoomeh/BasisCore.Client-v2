import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import CommandComponnect from "./CommandComponent";

export default abstract class SourceBaseComponent extends CommandComponnect {
  constructor(element: Element, context: IContext) {
    super(element, context);
    this.getAttributeValueAsync("datamembername").then((x) =>
      this.context.Repository.addHandler(x, this.onDataSourceAdded.bind(this))
    );
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
