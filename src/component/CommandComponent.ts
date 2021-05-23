import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import RangeableComponent from "./RangeableComponent";

export default abstract class CommandComponent extends RangeableComponent<Element> {
  public readonly core: string;
  constructor(element: Element, context: IContext) {
    super(element, context);
    this.core = this.node.getAttribute("core");
    this.addTriggers();
  }

  private async addTriggers() {
    const triggerKeys = (
      await this.getAttributeValueAsync("data-trigger-on")
    )?.split("|");
    if (triggerKeys) {
      this.addDataSourceToWatchList(triggerKeys);
    }
  }
  protected async canRenderCommandAsync(context: IContext): Promise<boolean> {
    const token = this.node.GetBooleanToken("if", context);
    const value = await token?.getValueAsync();
    return value ?? true;
  }

  protected abstract renderAsync(dataSource: IDataSource): Promise<string>;

  protected async getAttributeValueAsync(
    attributeName: string,
    defaultValue: string = null
  ): Promise<string> {
    const token = this.node.GetStringToken(attributeName, this.context);
    return (await token?.getValueAsync()) ?? defaultValue;
  }

  protected onDataSourceAdded(dataSource: IDataSource): void {
    this.canRenderCommandAsync(this.context).then((x) => {
      if (x) {
        this.renderAsync(dataSource).then((renderResult) => {
          this.applyResult(renderResult, dataSource.replace);
        });
      }
    });
  }
}
