import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import SourceBaseComponent from "../SourceBaseComponent";
import ComponentCollection from "../../ComponentCollection";
import ILocalContext from "../../context/ILocalContext";
import { AppendType } from "../../enum";

@injectable()
export default class RepeaterComponent extends SourceBaseComponent {
  readonly container: DependencyContainer;
  readonly oldChildContexts: Array<ILocalContext> = new Array<ILocalContext>();

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context);
    this.container = container;
  }
  protected async renderSourceAsync(
    dataSource: ISource,
    appendType: AppendType
  ): Promise<void> {
    const name = await this.getAttributeValueAsync("name");
    const replace = await this.getAttributeBooleanValueAsync("replace", true);
    if (replace) {
      this.range.deleteContents();
      this.oldChildContexts.forEach((x) => x.dispose());
      this.oldChildContexts.length = 0;
    }
    for (let index = 0; index < dataSource.data.rows.length; index++) {
      const row = dataSource.data.rows[index];
      const template = this.content.firstChild.cloneNode(true);
      var fragment = document.createDocumentFragment();
      const childNodes = [...template.childNodes];
      childNodes.forEach((node) => fragment.appendChild(node));
      this.setContent(fragment, appendType);
      const childContainer = this.container.createChildContainer();
      childContainer.register("OwnerContext", { useValue: this.context });
      childContainer.register("container", { useValue: childContainer });
      const localContext =
        childContainer.resolve<ILocalContext>("ILocalContext");
      this.oldChildContexts.push(localContext);
      localContext.setAsSource(`${name}.current`, row, dataSource.mergeType);
      childContainer.register("context", { useValue: localContext });
      const collection = childContainer.resolve(ComponentCollection);
      await collection.processNodesAsync(childNodes);
    }
  }
}
