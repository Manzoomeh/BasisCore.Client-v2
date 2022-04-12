import { inject, DependencyContainer, injectable } from "tsyringe";
import ComponentCollection from "../../ComponentCollection";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import IDisposable from "../../IDisposable";
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
  private manager: IComponentManager;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("dc") container: DependencyContainer
  ) {
    super(element, context, container);
  }
  public getLibAsync(objectName: string, url: string): Promise<any> {
    return $bc.util.getLibAsync(objectName, url);
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    const lib = this.core.slice(this.core.indexOf(".") + 1);
    const manager = await $bc.util.getComponentAsync(this.context, lib);
    this.manager = Reflect.construct(manager, [this]);
    if (this.manager.initializeAsync) {
      await this.manager.initializeAsync();
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

  public async processNodesAsync(nodes: Array<Node>): Promise<IDisposable> {
    const newCollection = this.dc.resolve(ComponentCollection);
    if (!this.collections) {
      this.collections = new Array<ComponentCollection>();
    }
    this.collections.push(newCollection);
    await newCollection.processNodesAsync(nodes);
    return newCollection;
  }

  public async disposeAsync(): Promise<void> {
    const tasks = this.collections?.map((collection) =>
      collection.disposeAsync()
    );
    await Promise.all(tasks);
    return super.disposeAsync();
  }
}
