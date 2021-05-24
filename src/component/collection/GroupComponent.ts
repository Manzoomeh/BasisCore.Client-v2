import { container, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import Util from "../../Util";
import CommandComponent from "../CommandComponent";
import Component from "../Component";
import IComponent from "../IComponent";
import { NonSourceBaseComponent } from "../NonSourceBaseComponent";
import { AttributeComponent } from "../text-base/AttributeComponent";
import TextComponent from "../text-base/TextComponent";

@injectable()
export default class GroupComponent extends Component<Node> {
  readonly componnet: Array<IComponent> = new Array<IComponent>();
  readonly regex: string;
  constructor(node: Node, @inject("IContext") context: IContext) {
    super(node, context);
    this.regex = this.context.options.getDefault("binding.regex");
    this.extractComponent();
  }

  public async runAsync(): Promise<string> {
    var tasks = this.componnet
      .filter((x) => x instanceof NonSourceBaseComponent)
      .map((x) => (x as NonSourceBaseComponent).renderAsync());

    await Promise.all(tasks);
    return null;
  }

  private extractComponent() {
    this.ExtratcBasisCommands();
    this.extractTextBaseComponents(this.node);
  }
  private ExtratcBasisCommands() {
    const elements = Util.findElementRootCommandNode(this.node);
    for (const item of elements) {
      this.componnet.push(this.createCommandComponent(item));
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
        this.componnet.push(com);
      }
    }
  }
  private extractAttributeComponent(element: Element) {
    for (const pair of element.attributes) {
      if (pair.value.trim().length != 0) {
        var match = pair.value.match(this.regex);
        if (match) {
          const com = new AttributeComponent(element, this.context, pair);
          this.componnet.push(com);
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
}
