import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import IDataSource from "../../data/IDataSource";
import SourceBaseComponent from "../SourceBaseComponent";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class RepeaterComponent extends SourceBaseComponent {
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
  }

  protected async renderSourceAsync(dataSource: IDataSource): Promise<Node> {
    for (let index = 0; index < dataSource.data.Rows.length; index++) {
      const row = dataSource.data.Rows[index];
      const template = this.content.firstChild.cloneNode(true);
      const childNodes = [...template.childNodes];
      childNodes.forEach((node) => this.setContent(node, false));
      const collection = new ComponentCollection(childNodes, this.context);
      await collection.initializeAsync();
      await collection.runAsync();
    }
    return null;
  }
}
