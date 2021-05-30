import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import LocalContext from "../../context/LocalContext";
import ISource from "../../data/ISource";
import SourceBaseComponent from "../SourceBaseComponent";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class RepeaterComponent extends SourceBaseComponent {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context, container);
  }
  protected async renderSourceAsync(dataSource: ISource): Promise<Node> {
    const name = await this.getAttributeValueAsync("name");
    for (let index = 0; index < dataSource.data.rows.length; index++) {
      const row = dataSource.data.rows[index];
      const template = this.content.firstChild.cloneNode(true);
      const childNodes = [...template.childNodes];
      childNodes.forEach((node) => this.setContent(node, false));
      const childContainer = this.container.createChildContainer();

      childContainer.register("OwnerContext", { useValue: this.context });
      childContainer.register("nodes", { useValue: childNodes });

      childContainer.register("container", { useValue: childContainer });
      const localContext = childContainer.resolve<LocalContext>(LocalContext);
      localContext.setAsSource(`${name}.current`, row);
      childContainer.register("context", { useValue: localContext });

      const collection = childContainer.resolve(ComponentCollection);
      await collection.initializeAsync();
      await collection.runAsync();
    }
    return null;
  }
}
