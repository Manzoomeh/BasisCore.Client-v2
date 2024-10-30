import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "./context/IContext";
import { Priority } from "./enum";
import CommandComponent from "./component/CommandComponent";
import IComponent from "./component/IComponent";
import { AttributeComponent } from "./component/text-base/AttributeComponent";
import TextComponent from "./component/text-base/TextComponent";
import IComponentCollection from "./IComponentCollection";

@injectable()
export default class ComponentCollection implements IComponentCollection {
  static readonly knowHtmlElement = ["form", "input", "select"];
  readonly context: IContext;
  readonly regex: RegExp;
  readonly blockRegex: RegExp;
  readonly container: DependencyContainer;
  private _initializeTask: Promise<void>;
  private readonly components: Array<IComponent> = [];
  private _disposed: boolean = false;
  public get disposed(): boolean {
    return this._disposed;
  }

  public get initializeTask(): Promise<void> {
    return this._initializeTask;
  }

  constructor(
    @inject("context") context: IContext,
    @inject("dc") container: DependencyContainer
  ) {
    this.container = container;
    this.context = context;
    this.regex = this.context.options.getDefault<RegExp>("binding.regex");
    this.blockRegex = this.context.options.getDefault<RegExp>(
      "binding.codeblock-regex"
    );
  }

  public async processNodesAsync(nodes: Array<Node>): Promise<void> {
    if (this._initializeTask) {
      throw new Error("Run ComponentCollection for more than one");
    }
    this._initializeTask = this.extractComponentAsync(nodes);
    await this._initializeTask;
    await this.runAsync();
  }

  private async runAsync(): Promise<void> {
    await Promise.all(
      this.components
        .filter((x) => x.priority == Priority.high)
        .map((x) => x.processAsync())
    );
    await Promise.all(
      this.components
        .filter((x) => x.priority == Priority.normal)
        .map((x) => x.processAsync())
    );
    await Promise.all(
      this.components
        .filter((x) => x.priority == Priority.low)
        .map((x) => x.processAsync())
    );
  }

  private async extractComponentAsync(nodes: Array<Node>): Promise<void> {
    const taskList: Array<Promise<void>> = [];
    nodes.forEach((node) => {
      taskList.push(
        new Promise((resolve) => {
          this.extractTextBaseComponents(node, taskList);
          resolve();
        })
      );
      taskList.push(
        new Promise((resolve) => {
          this.extractBasisCommands(node, taskList);
          resolve();
        })
      );
    });
    await Promise.all(taskList);
  }

  private extractBasisCommands(node: Node, initTaskList: Array<Promise<void>>) {
    const pair = this.findRootLevelComponentNode(node);
    for (const item of pair.coreList) {
      const core = item.getAttribute("core").split(".", 1)[0].toLowerCase();
      const component = this.createCommandComponent(item, core);
      this.components.push(component);
      initTaskList.push(component.initializeAsync());
    }
    for (const item of pair.tagList) {
      const tagName = item.tagName.toLowerCase();
      const key =
        ComponentCollection.knowHtmlElement.indexOf(tagName) != -1
          ? tagName
          : "unknown-html";
      const component = this.createCommandComponent(item, key);
      this.components.push(component);
      initTaskList.push(component.initializeAsync());
    }
  }

  private extractTextComponent(node: Text, initTaskList: Array<Promise<void>>) {
    if (node.textContent.trim().length != 0) {
      do {
        let match = node.textContent.match(this.regex);
        if (!match) {
          match = node.textContent.match(this.blockRegex);
        }
        if (match) {
          const component = new TextComponent(
            node,
            this.context,
            match.index,
            match.index + match[0].length
          );
          this.components.push(component);
          initTaskList.push(component.initializeAsync());
        } else {
          break;
        }
      } while (true);
    }
  }

  private async extractAttributeComponent(
    element: Element,
    initTaskList: Array<Promise<void>>
  ) {
    for (const pair of element.attributes) {
      if (pair.value.trim().length != 0) {
        let match = pair.value.match(this.regex);
        if (!match) {
          match = pair.value.match(this.blockRegex);
        }
        if (match) {
          const component = new AttributeComponent(element, this.context, pair);
          this.components.push(component);
          initTaskList.push(component.initializeAsync());
        }
      }
    }
  }

  private extractTextBaseComponents(
    element: Node,
    initTaskList: Array<Promise<void>>
  ) {
    if (element.nodeType == Node.TEXT_NODE) {
      this.extractTextComponent(element as Text, initTaskList);
    } else if (element.nodeType != Node.COMMENT_NODE) {
      if (element instanceof Element) {
        if (!element.isIgnoreTag()) {
          if (!element.isBasisCore()) {
            this.extractAttributeComponent(element, initTaskList);
            if (element.hasChildNodes()) {
              for (const child of element.childNodes) {
                this.extractTextBaseComponents(child, initTaskList);
              }
            }
          }
        }
      } else {
        if (element.hasChildNodes()) {
          for (const child of element.childNodes) {
            this.extractTextBaseComponents(child, initTaskList);
          }
        }
      }
    }
  }

  private createCommandComponent(
    element: Element,
    token: string
  ): CommandComponent {
    const childContainer = this.container.createChildContainer();
    childContainer.register("element", { useValue: element });
    childContainer.register("context", { useValue: this.context });
    childContainer.register("dc", { useValue: childContainer });
    childContainer.register("parent.dc", { useValue: this.container });
    return childContainer.resolve<CommandComponent>(token);
  }

  private findRootLevelComponentNode(rootElement: Node): {
    coreList: Array<Element>;
    tagList: Array<Element>;
  } {
    const coreList = new Array<Element>();
    const tagList = new Array<Element>();
    const process = (child: Node) => {
      if (child instanceof Element) {
        if (!child.isIgnoreTag()) {
          if (child.isBasisCore()) {
            coreList.push(child);
          } else {
            if (child.isBasisTag()) {
              tagList.push(child);
            }
            child.childNodes.forEach(process);
          }
        }
      } else {
        child.childNodes.forEach(process);
      }
    };
    process(rootElement);
    return { coreList, tagList };
  }

  public async disposeAsync(): Promise<void> {
    if (!this._disposed) {
      this._disposed = true;
      if (this.components.length > 0) {
        const tasks = this.components.map((component) =>
          component.disposeAsync()
        );
        await Promise.all(tasks);
        this.components.splice(0, this.components.length);
      }
    }
  }

  public GetCommandListByCore(core: string): Array<CommandComponent> {
    return this.GetCommandList().filter((x) => x.core == core);
  }

  public GetCommandList(): Array<CommandComponent> {
    return <any>this.components.filter((x) => x instanceof CommandComponent);
  }

  public GetComponentList(): Array<IComponent> {
    return this.components;
  }
}
