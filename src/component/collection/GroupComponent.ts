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
  private currentDC: DependencyContainer;

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

  public async runAsync(): Promise<void> {
    this.oldLocalContext?.dispose();
    this.currentDC = this.container.createChildContainer();
    this.currentDC.register("OwnerContext", {
      useValue: this.context,
    });
    this.currentDC.register("container", {
      useValue: this.currentDC,
    });

    const options = await this.getAttributeValueAsync("options");
    if (options) {
      const newOptions = defaultsDeep(
        eval(options),
        this.context.options.originalOptions
      );
      this.currentDC.register("IHostOptions", {
        useValue: newOptions,
      });
      this.oldLocalContext = this.currentDC.resolve(LocalRootContext);
    } else {
      this.oldLocalContext = this.currentDC.resolve("ILocalContext");
    }
    this.currentDC.register("context", {
      useValue: this.oldLocalContext,
    });
    this.collection = this.currentDC.resolve(ComponentCollection);
    await this.collection.processNodesAsync(this.childNodes);
  }

  public async disposeAsync(): Promise<void> {
    this.oldLocalContext?.dispose();
    await this.collection?.disposeAsync();
    this.currentDC?.clearInstances();
    return super.disposeAsync();
  }
}
