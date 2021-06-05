import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "./context/IContext";
import { Priority } from "./enum";
import CommandComponent from "./component/CommandComponent";
import IComponent from "./component/IComponent";
import { AttributeComponent } from "./component/text-base/AttributeComponent";
import TextComponent from "./component/text-base/TextComponent";

@injectable()
export default class ComponentCollection {
  readonly context: IContext;
  readonly regex: RegExp;
  readonly container: DependencyContainer;

  constructor(
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    this.container = container;
    this.context = context;
    this.regex = this.context.options.getDefault<RegExp>("binding.regex");
    console.log("ComponentCollection - ctor");
  }

  public async processNodesAsync(nodes: Array<Node>): Promise<void> {
    const components = this.extractComponent(nodes);
    await this.initializeAsync(components);
    await this.runAsync(components);
  }

  private async initializeAsync(components: Array<IComponent>): Promise<void> {
    const tasks = components.map((x) => x.initializeAsync());
    await Promise.all(tasks);
  }

  private async runAsync(components: Array<IComponent>): Promise<void> {
    console.log("ComponentCollection.runAsync");

    const priorityMap = components.reduce((map, component) => {
      let list = map.get(component.priority);
      if (!list) {
        list = new Array<IComponent>();
        map.set(component.priority, list);
      }
      list.push(component);
      return map;
    }, new Map<Priority, Array<IComponent>>());
    for (const enumValue in Priority) {
      if (isNaN(Number(enumValue))) {
        const key: any = Priority[enumValue];
        const relatedComponent = priorityMap.get(key);
        if (relatedComponent) {
          const taskList = relatedComponent.map((x) => x.processAsync());
          await Promise.all(taskList);
        }
      }
    }
  }

  private extractComponent(nodes: Array<Node>): Array<IComponent> {
    const components = new Array<IComponent>();
    nodes.forEach((node) => {
      this.extractTextBaseComponents(node, components);
      this.extractBasisCommands(node, components);
    });
    return components;
  }
  private extractBasisCommands(node: Node, components: Array<IComponent>) {
    const pair = this.findRootLevelComponentNode(node);
    for (const item of pair.coreList) {
      components.push(
        this.createCommandComponent(
          item,
          item.getAttribute("core").toLowerCase()
        )
      );
    }
    for (const item of pair.tagList) {
      components.push(
        this.createCommandComponent(item, item.tagName.toLowerCase())
      );
    }
  }
  private extractTextComponent(node: Text, components: Array<IComponent>) {
    if (node.textContent.trim().length != 0) {
      do {
        const match = node.textContent.match(this.regex);
        if (!match) {
          break;
        }
        var com = new TextComponent(
          node,
          this.context,
          match.index,
          match.index + match[0].length
        );
        components.push(com);
      } while (true);
    }
  }
  private async extractAttributeComponent(
    element: Element,
    components: Array<IComponent>
  ) {
    for (const pair of element.attributes) {
      if (pair.value.trim().length != 0) {
        var match = pair.value.match(this.regex);
        if (match) {
          const com = new AttributeComponent(element, this.context, pair);
          components.push(com);
        }
      }
    }
  }
  private extractTextBaseComponents(
    element: Node,
    components: Array<IComponent>
  ) {
    if (element.nodeType == Node.TEXT_NODE) {
      this.extractTextComponent(element as Text, components);
    } else if (element.nodeType != Node.COMMENT_NODE) {
      if (element instanceof Element) {
        if (!element.isBasisCore()) {
          this.extractAttributeComponent(element, components);
          if (element.hasChildNodes()) {
            for (const child of element.childNodes) {
              this.extractTextBaseComponents(child, components);
            }
          }
        }
      } else {
        if (element.hasChildNodes()) {
          for (const child of element.childNodes) {
            this.extractTextBaseComponents(child, components);
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
    childContainer.register("container", { useValue: childContainer });
    return childContainer.resolve<CommandComponent>(token);
  }
  private findRootLevelComponentNode(rootElement: Node): {
    coreList: Array<Element>;
    tagList: Array<Element>;
  } {
    const coreList = new Array<Element>();
    const tagList = new Array<Element>();
    var process = (child: Node) => {
      if (child instanceof Element) {
        if (child.isBasisCore()) {
          coreList.push(child);
          return;
        } else if (child.isBasisTag()) {
          tagList.push(child);
        }
      }
      child.childNodes.forEach(process);
    };

    process(rootElement);
    return { coreList, tagList };
  }
}
