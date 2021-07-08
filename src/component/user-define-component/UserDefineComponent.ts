import { inject, DependencyContainer, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import { MergeType } from "../../enum";
import { SourceId } from "../../type-alias";
import CommandComponent from "../CommandComponent";
import IComponentManager from "./IComponentManager";
import IUserDefineComponent from "./IUserDefineComponent";

@injectable()
export default class UserDefineComponent
  extends CommandComponent
  implements IUserDefineComponent
{
  readonly container: DependencyContainer;
  readonly manager: IComponentManager;
  readonly range: Range;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context);
    this.container = container;
    this.range = new Range();
    this.range.selectNode(element);
    this.range.extractContents();
    const managerType = this.node.attributes["manager"].value;
    const factoryWrapperFn = new Function(
      "component",
      `return new ${managerType}(component);`
    );
    this.manager = factoryWrapperFn(this);
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    if (this.manager.initializeAsync) {
      await this.manager.initializeAsync();
    }
  }
  protected runAsync(source?: ISource): Promise<boolean> {
    return this.manager.runAsync
      ? this.manager.runAsync(source)
      : Promise.resolve(true);
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
