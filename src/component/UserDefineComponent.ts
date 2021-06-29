import { inject, DependencyContainer, injectable } from "tsyringe";
import IContext from "../context/IContext";
import { AppendType } from "../enum";
import CommandComponent from "./CommandComponent";

@injectable()
export class UserDefineComponent
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
  protected runAsync(): Promise<void> {
    return this.manager.runAsync ? this.manager.runAsync() : Promise.resolve();
  }

  public toNode(rawHtml: string): Node {
    return document.createRange().createContextualFragment(rawHtml);
  }
  public setContent(
    newContent: Node,
    appendType: AppendType = AppendType.replace
  ) {
    switch (appendType) {
      case AppendType.after: {
        const currentContent = this.range.extractContents();
        currentContent.appendChild(newContent);
        this.range.insertNode(currentContent);
        break;
      }
      case AppendType.before: {
        this.range.insertNode(newContent);
        break;
      }
      default: {
        this.range.deleteContents();
        this.range.insertNode(newContent);
        break;
      }
    }
  }
}
interface IUserDefineComponent {
  toNode(rawHtml: string): Node;
  setContent(newContent: Node, appendType?: AppendType): void;
}

interface IComponentManager {
  initializeAsync(): Promise<void>;
  runAsync(): Promise<void>;
}
