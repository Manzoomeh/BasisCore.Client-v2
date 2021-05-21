import Print from "../command/renderable/Print";
import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import RenderableBase from "../renderable/RenderableBase";
import CommandComponnect from "./CommandComponnect";

export default class UnknoneCommand extends CommandComponnect<RenderableBase> {
  //readonly sources :Array<string> = new Array<string>();
  constructor(node: Element, context: IContext) {
    super(node, context);
    this.command = new Print(this.content.firstChild as Element);
  }

  onDataSourceAdded(dataSource: IDataSource): void {
    this.canRenderCommandAsync().then((x) => {
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

  private AppendContent(container: Element, tagString: string) {
    try {
      var range = document.createRange();
      range.selectNode(container);
      var documentFragment = range.createContextualFragment(tagString);
      container.appendChild(documentFragment);
    } catch (err) {
      console.error(err);
    }
  }
  private ReplaceContent(container: Element, tagString: string) {
    try {
      var range = document.createRange();
      range.selectNode(container);
      var documentFragment = range.createContextualFragment(tagString);
      container.innerHTML = "";
      container.appendChild(documentFragment);
    } catch (err) {
      console.error(err);
    }
  }
}
