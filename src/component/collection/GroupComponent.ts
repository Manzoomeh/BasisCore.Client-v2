import { injectable, inject, DependencyContainer } from "tsyringe";
import IContext from "../../context/IContext";
import ComponentCollection from "../../ComponentCollection";
import CommandComponent from "../CommandComponent";
import LocalRootContext from "../../context/LocalRootContext";
import defaultsDeep from "lodash.defaultsdeep";
import Context from "../../context/Context";
import IComponentCollection from "../../IComponentCollection";

@injectable()
export default class GroupComponent extends CommandComponent {
  private _collections: Array<ComponentCollection> =
    new Array<ComponentCollection>();
  readonly container: DependencyContainer;
  readonly childNodes: Array<ChildNode>;
  private oldLocalContext: Context;
  private currentDC: DependencyContainer;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("dc") container: DependencyContainer
  ) {
    super(element, context);
    this.container = container;
    this.childNodes = [...element.childNodes];
    this.fillContent();
  }

  private fillContent() {
    const content = document.createDocumentFragment();
    this.childNodes.forEach((node) => content.appendChild(node));
    this.range.setContent(content);
  }

  public async runAsync(): Promise<void> {
    if (this.isHide) {
      this.fillContent();
    }
    this.oldLocalContext?.dispose();
    this.currentDC = this.container.createChildContainer();
    this.currentDC.register("parent.context", { useValue: this.context });
    this.currentDC.register("dc", { useValue: this.currentDC });
    this.currentDC.register("parent.dc", { useValue: this.container });

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
    const collection = this.currentDC.resolve(ComponentCollection);
    this._collections.push(collection);
    await collection.processNodesAsync(this.childNodes);
  }

  protected override hideAsync(): Promise<void> {
    this.oldLocalContext?.dispose();
    this.range.deleteContents();
    return super.hideAsync();
  }

  public async processNodesAsync(
    nodes: Array<Node>
  ): Promise<IComponentCollection> {
    const newCollection = this.currentDC.resolve(ComponentCollection);
    this._collections.push(newCollection);
    await newCollection.processNodesAsync(nodes);
    return newCollection;
  }

  public async disposeAsync(): Promise<void> {
    this.oldLocalContext?.dispose();
    const tasks = this._collections?.map((collection) =>
      collection.disposeAsync()
    );
    await Promise.all(tasks);
    this.currentDC?.clearInstances();
    return super.disposeAsync();
  }
}
