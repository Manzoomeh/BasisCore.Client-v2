import { container } from "tsyringe";
import IContext from "../../context/IContext";
import CommandComponent from "../CommandComponent";
import IComponent from "../IComponent";
import { AttributeComponent } from "../text-base/AttributeComponent";
import TextComponent from "../text-base/TextComponent";
import { NonRangeableComponent } from "./NonRangeableComponent";

export default class ComponentCollection {
  private readonly initializeTask: Promise<void>;
  readonly nodes: Array<Node>;
  readonly context: IContext;
  readonly components: Array<IComponent> = new Array<IComponent>();
  readonly regex: string;

  constructor(nodeList: Array<Node>, context: IContext) {
    console.log("collection", nodeList);
    this.nodes = nodeList;
    this.context = context;
    this.regex = this.context.options.getDefault("binding.regex");
    this.initializeTask = this.extractComponentAsync();
  }

  public async initializeAsync(): Promise<void> {
    return this.initializeTask;
  }

  public async runAsync(): Promise<void> {
    var tasks = this.components
      .filter((x) => x instanceof NonRangeableComponent)
      .map((x) => {
        console.log("nosourcable", x);
        return (x as any).renderAsync();
      });

    await Promise.all(tasks);
  }

  private async extractComponentAsync(): Promise<void> {
    this.nodes.forEach((node) => {
      this.extractTextBaseComponents(node);
      this.extractBasisCommands(node);
    });

    console.log("components", this.components, this.nodes);
    await Promise.all(this.components.map((x) => x.initializeAsync()));
  }
  private extractBasisCommands(node: Node) {
    const nodes = this.findRootLevelComponentNode(node);
    console.log("Root Command nodes", nodes, node);
    for (const item of nodes) {
      this.components.push(this.createCommandComponent(item));
    }
  }
  private extractTextComponent(node: Node) {
    var content = node.textContent;
    if (content.trim().length != 0) {
      var match = content.match(this.regex);
      if (match) {
        var com = new TextComponent(
          node,
          this.context,
          match.index,
          match.index + match[0].length
        );

        this.components.push(com);
      }
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
      this.extractTextComponent(element);
    } else {
      if (element instanceof Element) {
        if (element.tagName != "BASIS") {
          this.extractAttributeComponent(element);
          if (element.hasChildNodes()) {
            for (const child of element.childNodes) {
              this.extractTextBaseComponents(child);
            }
          } else {
            this.extractTextComponent(element);
          }
        }
      } else {
        if (element.hasChildNodes()) {
          for (const child of element.childNodes) {
            this.extractTextBaseComponents(child);
          }
        } else {
          this.extractTextComponent(element);
        }
      }
    }
  }

  private createCommandComponent(element: Element): CommandComponent {
    const childContainer = container.createChildContainer();
    const core = element.getAttribute("core")?.toLowerCase();
    childContainer.register(Element, { useValue: element });
    childContainer.register("IContext", { useValue: this.context });
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
