import { inject, DependencyContainer, injectable } from "tsyringe";
import ComponentCollection from "../../ComponentCollection";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import IComponentCollection from "../../IComponentCollection";
import IBCUtil from "../../wrapper/IBCUtil";
import ComponentContainer from "./ComponentContainer";
import IComponentManager from "./IComponentManager";
import IUserDefineComponent from "./IUserDefineComponent";

declare const $bc: IBCUtil;
@injectable()
export default class UserDefineComponent
  extends ComponentContainer
  implements IUserDefineComponent
{
  private collections: Array<ComponentCollection>;
  manager: IComponentManager;
  readonly onInitialized: Promise<IUserDefineComponent>;
  private _resolve: (component: IUserDefineComponent) => void;
  private _reject: (reason: any) => void;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("dc") container: DependencyContainer
  ) {
    super(element, context, container);
    this.onInitialized = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }
  public getLibAsync(objectName: string, url: string): Promise<any> {
    return $bc.util.getLibAsync(objectName, url);
  }

  public async initializeAsync(): Promise<void> {
    try {
      await super.initializeAsync();
      const lib = this.core.slice(this.core.indexOf(".") + 1);
      const manager = await $bc.util.getComponentAsync(this.context, lib);
      this.manager = Reflect.construct(manager, [this]);
      if (this.manager.initializeAsync) {
        await this.manager.initializeAsync();
      }
      this._resolve(this);
    } catch (ex) {
      this._reject(ex);
    }
  }

  protected runAsync(source?: ISource): Promise<any> {
    return this.manager.runAsync
      ? this.manager.runAsync(source)
      : Promise.resolve();
  }

  public setContent(newContent: Node) {
    this.range.setContent(newContent);
  }

  public async processNodesAsync(
    nodes: Array<Node>
  ): Promise<IComponentCollection> {
    const newCollection = this.dc.resolve(ComponentCollection);
    if (!this.collections) {
      this.collections = new Array<ComponentCollection>();
    }
    this.collections.push(newCollection);
    await newCollection.processNodesAsync(nodes);
    return newCollection;
  }

  public async disposeAsync(): Promise<void> {
    try {
      if (typeof this.manager.disposeAsync === "function") {
        await this.manager.disposeAsync();
      }
    } catch (ex) {
      console.error("error in dispose component", ex);
    }
    const tasks = this.collections?.map((collection) =>
      collection.disposeAsync()
    );
    await Promise.all(tasks);
    return super.disposeAsync();
  }
}
