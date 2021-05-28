import { injectable } from "tsyringe";
import IDataSource from "../../data/IDataSource";
import SourceBaseComponent from "../SourceBaseComponent";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class RepeaterComponent extends SourceBaseComponent {
  protected async renderSourceAsync(dataSource: IDataSource): Promise<Node> {
    for (let index = 0; index < dataSource.data.Rows.length; index++) {
      const row = dataSource.data.Rows[index];
      const template = this.content.firstChild.cloneNode(true);
      const childNodes = [...template.childNodes];
      childNodes.forEach((node) => this.setContent(node, false));
      const childContainer = this.container.createChildContainer();
      childContainer.register("nodes", { useValue: childNodes });
      childContainer.register("context", { useValue: this.context });
      childContainer.register("container", { useValue: childContainer });
      const collection = childContainer.resolve(ComponentCollection);
      await collection.initializeAsync();
      await collection.runAsync();
    }
    return null;
  }
}
