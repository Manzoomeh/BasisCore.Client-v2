import { container, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import CommandComponent from "../CommandComponent";
import Component from "../Component";
import IComponent from "../IComponent";
import { NonSourceBaseComponent } from "../NonSourceBaseComponent";
import { AttributeComponent } from "../text-base/AttributeComponent";
import TextComponent from "../text-base/TextComponent";

@injectable()
export default class GroupComponent extends Component<Element> {
  readonly componnet: Array<IComponent> = new Array<IComponent>();
  readonly regex: string;
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
    this.regex = this.context.options.getDefault("binding.regex");
    this.extractComponent();
  }

  public async runAsync(): Promise<string> {
    var tasks = this.componnet
      .filter((x) => x instanceof NonSourceBaseComponent)
      .map((x) => (x as NonSourceBaseComponent).runAsync());

    await Promise.all(tasks);
    return null;
  }

  private extractComponent() {
    this.ExtratcBasisCommands();
    this.extractTextBaseComponents(this.node);
  }
  private ExtratcBasisCommands() {
    const elements = Array.from(this.node.getElementsByTagName("basis"));
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
    for (const pair of Array.from(element.attributes)) {
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
      if (element instanceof Element)
        if (element.tagName != "BASIS") {
          this.extractAttributeComponent(element);
          if (element.hasChildNodes()) {
            for (const child of Array.from(element.childNodes)) {
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

  // async ExecuteCommandAsync(turnContext: RenderingTurnContext): Promise<void> {
  //   var groupTemplate: Element;

  //   var tasks = Array<Promise<void>>();
  //   var isNativeGroupCommand = Util.IsEqual(turnContext.Core, "group");
  //   var renderToIsValid = turnContext.Context.RenderToIsValid;
  //   if (isNativeGroupCommand) {
  //     renderToIsValid = await turnContext.GetCanUseRenderToAsync();
  //     groupTemplate = document.createElement("div");
  //     var tmp = Array.from(this.Element.childNodes);
  //     this.Element.appendChild(groupTemplate);
  //     tmp.forEach((node) => groupTemplate.appendChild(node.cloneNode(true)));
  //   } else {
  //     groupTemplate = this.Element;
  //   }

  //   var localContext = new LocalContext(turnContext.Context, renderToIsValid);
  //   await this.ProcessCallAsync(localContext);
  //   Util.FindElementRootCommandNode(groupTemplate)
  //     .filter((x) => !Util.IsEqual(x.getAttribute("core"), "call"))
  //     .map((x) => CommandMaker.ToCommand(x))

  //     .forEach((command) => tasks.push(command.ExecuteAsync(localContext)));
  //   await Promise.all(tasks);
  //   await this.ReplaceNotationAsync(groupTemplate, localContext);
  //   if (isNativeGroupCommand) {
  //     var result = groupTemplate.innerHTML;
  //     groupTemplate.remove();
  //     await super.ApplyResultAsync(result, turnContext, true);
  //   }
  //   localContext.Dispose();
  // }

  // private async ProcessCallAsync(context: IContext): Promise<void> {
  //   var calls = Util.FindElementRootCommandNode(this.Element).filter((x) =>
  //     Util.IsEqual(x.getAttribute("core"), "call")
  //   );
  //   //while (calls.length > 0)
  //   {
  //     var commands: Array<ICommand> = [];
  //     calls.forEach((element) =>
  //       commands.push(CommandMaker.ToCommand(element))
  //     );
  //     var tasks = Array<Promise<void>>();
  //     commands.forEach((command) => tasks.push(command.ExecuteAsync(context)));
  //     await Promise.all(tasks);
  //     // calls = Util.FindElementRootCommandNode(this.Element).filter((x) =>
  //     //   Util.IsEqual(x.getAttribute("core"), "call")
  //     // );
  //   }
  // }

  // private async ReplaceNotationAsync(root: Element, context: IContext) {
  //   if (root.nodeType == Node.TEXT_NODE) {
  //     var token = await this.CheckContentForNotationAsync(root.textContent);
  //     if (token) {
  //       root.textContent = await Util.GetValueOrDefaultAsync(token, context);
  //     }
  //   } else {
  //     for (var index = 0; index < root.attributes?.length ?? 0; index++) {
  //       token = await this.CheckContentForNotationAsync(
  //         root.attributes[index].value
  //       );
  //       if (token) {
  //         root.attributes[index].value = await Util.GetValueOrDefaultAsync(
  //           token,
  //           context
  //         );
  //       }
  //     }
  //     root.childNodes.forEach((x) => {
  //       if (!(x instanceof Element) || !(<Element>x).IsBasisCore()) {
  //         this.ReplaceNotationAsync(<Element>x, context);
  //       }
  //     });
  //   }
  // }

  // private CheckContentForNotationAsync(data: string): IToken<string> {
  //   var token = data.ToStringToken();
  //   return token instanceof StringObject || token instanceof StringArray
  //     ? token
  //     : null;
  // }
}
