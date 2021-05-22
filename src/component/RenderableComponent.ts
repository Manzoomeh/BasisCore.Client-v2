import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import RenderableBase from "../renderable/RenderableBase";
import CommandComponnect from "./CommandContainerComponent";

export default class RenderableComponent extends CommandComponnect<RenderableBase> {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  onDataSourceAdded(dataSource: IDataSource): void {
    this.canRenderCommandAsync(this.context).then((x) => {
      if (x) {
        this.command.getSourceNamesAsync(this.context).then((sources) => {
          if (sources.indexOf(dataSource.data.Name) != -1) {
            this.command
              .renderAsync(dataSource, this.context)
              .then((renderResult) => {
                this.applyResult(renderResult, dataSource.replace);
              });
          }
        });
      }
    });
  }
}
