import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import CommandComponent from "../CommandComponent";
import IComponent from "../IComponent";
import { NonSourceBaseComponent } from "../NonSourceBaseComponent";
import { AttributeComponent } from "../text-base/AttributeComponent";
import TextComponent from "../text-base/TextComponent";

@injectable()
export default class ComponentCollection {
  private initializeTask: Promise<void> = Promise.resolve();
  readonly nodes: Array<Node> = new Array<Node>();
  readonly context: IContext;
  readonly components: Array<IComponent> = new Array<IComponent>();
  readonly regex: RegExp;
  readonly container: DependencyContainer;

  constructor(
    @inject("nodes") nodes: Array<Node>,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    this.container = container;
    this.context = context;
    this.regex = this.context.options.getDefault<RegExp>("binding.regex");
    this.addNodes(nodes);
  }

  public addNodes(nodes: Array<Node>) {
    this.nodes.push(...nodes);
    this.initializeTask = this.initializeTask.then((_) =>
      this.extractComponentAsync(nodes)
    );
  }

  public async initializeAsync(): Promise<void> {
    return this.initializeTask;
  }

  public async runAsync(): Promise<void> {
    var tasks = this.components
      .filter((x) => x instanceof NonSourceBaseComponent)
      .map((x) => (x as NonSourceBaseComponent).renderAsync());
    await Promise.all(tasks);
  }

  private async extractComponentAsync(nodes: Array<Node>): Promise<void> {
    nodes.forEach((node) => {
      this.extractTextBaseComponents(node);
      this.extractBasisCommands(node);
    });

    //console.log("components", this.components, this.nodes);
    await Promise.all(this.components.map((x) => x.initializeAsync()));
  }
  private extractBasisCommands(node: Node) {
    const nodes = this.findRootLevelComponentNode(node);
    //console.log("Root Command nodes", nodes, node);
    for (const item of nodes) {
      this.components.push(this.createCommandComponent(item));
    }
  }
  private extractTextComponent(node: Text) {
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
        this.components.push(com);
      } while (true);
    }
  }
  private async extractAttributeComponent(element: Element) {
    for (const pair of element.attributes) {
      if (pair.value.trim().length != 0) {
        var match = pair.value.match(this.regex);
        if (match) {
          const com = new AttributeComponent(element, this.context, pair);
          this.components.push(com);
        }
      }
    }
  }
  private extractTextBaseComponents(element: Node) {
    if (element.nodeType == Node.TEXT_NODE) {
      this.extractTextComponent(element as Text);
    } else if (element.nodeType != Node.COMMENT_NODE) {
      if (element instanceof Element) {
        if (!element.isBasisCore()) {
          this.extractAttributeComponent(element);
          if (element.hasChildNodes()) {
            for (const child of element.childNodes) {
              this.extractTextBaseComponents(child);
            }
          }
          // else {
          //   this.extractTextComponent(element);
          // }
        }
      } else {
        if (element.hasChildNodes()) {
          for (const child of element.childNodes) {
            this.extractTextBaseComponents(child);
          }
        }
        // } else {
        //   this.extractTextComponent(element);
        // }
      }
    }
  }

  private createCommandComponent(element: Element): CommandComponent {
    const childContainer = this.container.createChildContainer();
    const core = element.getAttribute("core")?.toLowerCase();
    childContainer.register("element", { useValue: element });
    childContainer.register("context", { useValue: this.context });
    childContainer.register("container", { useValue: childContainer });
    return childContainer.resolve<CommandComponent>(core);
  }
  private findRootLevelComponentNode(rootElement: Node): Array<Element> {
    var retVal: Array<Element> = [];
    var process = (child: ChildNode) => {
      if (child instanceof Element && child.isBasisCore()) {
        retVal.push(<any>child);
      } else {
        child.childNodes.forEach(process);
      }
    };

    [rootElement].forEach(process);
    return retVal;
  }
}
