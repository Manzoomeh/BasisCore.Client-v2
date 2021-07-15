import { inject, DependencyContainer, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import { MergeType } from "../../enum";
import { SourceId } from "../../type-alias";
import IBCUtil from "../../wrapper/IBCUtil";
import CommandComponent from "../CommandComponent";
import IComponentManager from "./IComponentManager";
import IUserDefineComponent from "./IUserDefineComponent";

declare const $bc: IBCUtil;
@injectable()
export default class UserDefineComponent
  extends CommandComponent
  implements IUserDefineComponent
{
  readonly container: DependencyContainer;
  private manager: IComponentManager;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context);
    this.container = container;
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

  public toNode(rawHtml: string): Node {
    return document.createRange().createContextualFragment(rawHtml);
  }

  public setContent(newContent: Node) {
    this.range.deleteContents();
    this.range.insertNode(newContent);
  }

  public getDefault<T>(key: string, defaultValue?: T): T {
    return this.context.options.getDefault<T>(key, defaultValue);
  }

  public getSetting<T>(key: string, defaultValue: T): T {
    return this.context.options.getSetting<T>(key, defaultValue);
  }

  public setSource(
    sourceId: SourceId,
    data: any,
    mergeType?: MergeType,
    preview?: boolean
  ): void {
    this.context.setAsSource(sourceId, data, mergeType, preview);
  }
}
