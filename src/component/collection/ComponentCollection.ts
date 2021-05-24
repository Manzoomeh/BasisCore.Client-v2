import { container } from "tsyringe";
import IContext from "../../context/IContext";
import CommandComponent from "../CommandComponent";
import IComponent from "../IComponent";
import { NonSourceBaseComponent } from "../NonSourceBaseComponent";
import { AttributeComponent } from "../text-base/AttributeComponent";
import TextComponent from "../text-base/TextComponent";

export default class ComponentCollection {
  //extends Component<Node> {
  readonly nodes: Array<Node>;
  readonly context: IContext;

  constructor(nodeList: Array<Node>, context: IContext) {
    this.nodes = nodeList;
    this.context = context;
    this.regex = this.context.options.getDefault("binding.regex");
    this.extractComponent();
  }
  readonly componnets: Array<IComponent> = new Array<IComponent>();
  readonly regex: string;

  public async runAsync(): Promise<void> {
    var tasks = this.componnets
      .filter((x) => x instanceof NonSourceBaseComponent)
      .map((x) => (x as NonSourceBaseComponent).renderAsync());

    await Promise.all(tasks);
  }

  private extractComponent() {
    this.nodes.forEach((node) => {
      this.ExtratcBasisCommands(node);
      this.extractTextBaseComponents(node);
    });
  }
  private ExtratcBasisCommands(node: Node) {
    const elements = this.findElementRootCommandNode(node);
    for (const item of elements) {
      this.componnets.push(this.createCommandComponent(item));
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
        this.componnets.push(com);
      }
    }
  }
  private extractAttributeComponent(element: Element) {
    for (const pair of element.attributes) {
      if (pair.value.trim().length != 0) {
        var match = pair.value.match(this.regex);
        if (match) {
          const com = new AttributeComponent(element, this.context, pair);
          this.componnets.push(com);
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
  private findElementRootCommandNode(rootElement: Node): Array<Element> {
    var retVal: Array<Element> = [];
    var prodcess = (child: ChildNode) => {
      if (child instanceof Element && child.isBasisCore()) {
        retVal.push(<any>child);
      } else {
        child.childNodes.forEach(prodcess);
      }
    };
    rootElement.childNodes.forEach(prodcess);
    return retVal;
  }
}
