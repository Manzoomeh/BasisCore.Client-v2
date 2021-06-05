import { injectable, inject, DependencyContainer } from "tsyringe";
import IContext from "../../context/IContext";
import ComponentCollection from "../../ComponentCollection";
import CommandComponent from "../CommandComponent";
import ILocalContext from "../../context/ILocalContext";

@injectable()
export default class GroupComponent extends CommandComponent {
  private collection: ComponentCollection;
  readonly container: DependencyContainer;
  readonly childNodes: Array<ChildNode>;
  private oldLocalContext: ILocalContext;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context);
    this.container = container;
    const content = document.createDocumentFragment();
    this.childNodes = [...element.childNodes];
    this.childNodes.forEach((node) => content.appendChild(node));
    const range = document.createRange();
    range.selectNode(element);
    range.deleteContents();
    range.insertNode(content);
  }

  public async runAsync(): Promise<void> {
    console.log("group - runAsync");
    if (this.oldLocalContext) {
      this.oldLocalContext.dispose();
    }
    const childContainer = this.container.createChildContainer();
    childContainer.register("OwnerContext", { useValue: this.context });
    childContainer.register("container", { useValue: childContainer });
    this.oldLocalContext =
      childContainer.resolve<ILocalContext>("ILocalContext");
    childContainer.register("context", { useValue: this.oldLocalContext });
    this.collection = childContainer.resolve(ComponentCollection);
    await this.collection.processNodesAsync(this.childNodes);
  }
}
