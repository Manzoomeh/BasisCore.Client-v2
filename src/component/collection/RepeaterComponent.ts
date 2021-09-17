import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import SourceBaseComponent from "../SourceBaseComponent";
import ComponentCollection from "../../ComponentCollection";
import ILocalContext from "../../context/ILocalContext";

@injectable()
export default class RepeaterComponent extends SourceBaseComponent {
  readonly container: DependencyContainer;
  readonly oldChildContexts: Array<ILocalContext> = new Array<ILocalContext>();
  readonly collections: Array<ComponentCollection> =
    new Array<ComponentCollection>();

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context);
    this.container = container;
  }

  protected async renderSourceAsync(dataSource: ISource): Promise<void> {
    const name = await this.getAttributeValueAsync("name");
    const replace = await this.getAttributeBooleanValueAsync("replace", true);
    if (replace) {
      this.range.deleteContents();
      await this.disposeExistingObjectAsync();
    }
    for (let index = 0; index < dataSource.rows.length; index++) {
      const row = dataSource.rows[index];
      const template = this.content.firstChild.cloneNode(true);
      var fragment = document.createDocumentFragment();
      const childNodes = [...template.childNodes];
      childNodes.forEach((node) => fragment.appendChild(node));
      this.setContent(fragment, true);
      const childContainer = this.container.createChildContainer();
      childContainer.register("OwnerContext", { useValue: this.context });
      childContainer.register("container", { useValue: childContainer });
      const localContext =
        childContainer.resolve<ILocalContext>("ILocalContext");
      this.oldChildContexts.push(localContext);
      localContext.setAsSource(
        `${name}.current`,
        row,
        dataSource.cloneOptions()
      );
      childContainer.register("context", { useValue: localContext });
      const collection = childContainer.resolve(ComponentCollection);
      this.collections.push(collection);
      await collection.processNodesAsync(childNodes);
    }
  }

  private async disposeExistingObjectAsync(): Promise<void> {
    if (this.oldChildContexts.length > 0) {
      this.oldChildContexts.forEach((x) => x.dispose());
      this.oldChildContexts.splice(0, this.oldChildContexts.length);
    }
    if (this.collections.length > 0) {
      const tasks = this.collections.map((x) => x.disposeAsync());
      await Promise.all(tasks);
      this.collections.splice(0, this.collections.length);
    }
  }

  public async disposeAsync(): Promise<void> {
    await this.disposeExistingObjectAsync();
    return super.disposeAsync();
  }
}
