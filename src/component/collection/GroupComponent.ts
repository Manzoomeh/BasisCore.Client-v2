import { injectable, inject, DependencyContainer } from "tsyringe";
import IContext from "../../context/IContext";
import ComponentCollection from "../../ComponentCollection";
import CommandComponent from "../CommandComponent";
import LocalRootContext from "../../context/LocalRootContext";
import defaultsDeep from "lodash.defaultsdeep";
import Context from "../../context/Context";

@injectable()
export default class GroupComponent extends CommandComponent {
  private collection: ComponentCollection;
  readonly container: DependencyContainer;
  readonly childNodes: Array<ChildNode>;
  private oldLocalContext: Context;

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
    this.range.insertNode(content);
  }

  public async runAsync(): Promise<boolean> {
    if (this.oldLocalContext) {
      this.oldLocalContext.dispose();
    }
    const childContainer = this.container.createChildContainer();
    childContainer.register("OwnerContext", { useValue: this.context });
    childContainer.register("container", { useValue: childContainer });

    const options = await this.getAttributeValueAsync("options");
    if (options) {
      const newOptions = defaultsDeep(
        eval(options),
        this.context.options.originalOptions
      );
      childContainer.register("IHostOptions", { useValue: newOptions });
      this.oldLocalContext = childContainer.resolve(LocalRootContext);
    } else {
      this.oldLocalContext = childContainer.resolve("ILocalContext");
    }
    childContainer.register("context", { useValue: this.oldLocalContext });
    this.collection = childContainer.resolve(ComponentCollection);
    await this.collection.processNodesAsync(this.childNodes);
    return true;
  }
}
