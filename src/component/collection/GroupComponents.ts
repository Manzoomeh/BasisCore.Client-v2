// export default class Group extends CommandBase {
//     constructor(element: Element) {
//       super(element);
//     }

//     async ExecuteCommandAsync(turnContext: RenderingTurnContext): Promise<void> {
//       var groupTemplate: Element;

//       var tasks = Array<Promise<void>>();
//       var isNativeGroupCommand = Util.IsEqual(turnContext.Core, "group");
//       var renderToIsValid = turnContext.Context.RenderToIsValid;
//       if (isNativeGroupCommand) {
//         renderToIsValid = await turnContext.GetCanUseRenderToAsync();
//         groupTemplate = document.createElement("div");
//         var tmp = Array.from(this.Element.childNodes);
//         this.Element.appendChild(groupTemplate);
//         tmp.forEach((node) => groupTemplate.appendChild(node.cloneNode(true)));
//       } else {
//         groupTemplate = this.Element;
//       }

//       var localContext = new LocalContext(turnContext.Context, renderToIsValid);
//       await this.ProcessCallAsync(localContext);
//       Util.FindElementRootCommandNode(groupTemplate)
//         .filter((x) => !Util.IsEqual(x.getAttribute("core"), "call"))
//         .map((x) => CommandMaker.ToCommand(x))

//         .forEach((command) => tasks.push(command.ExecuteAsync(localContext)));
//       await Promise.all(tasks);
//       await this.ReplaceNotationAsync(groupTemplate, localContext);
//       if (isNativeGroupCommand) {
//         var result = groupTemplate.innerHTML;
//         groupTemplate.remove();
//         await super.ApplyResultAsync(result, turnContext, true);
//       }
//       localContext.Dispose();
//     }

//     private async ProcessCallAsync(context: IContext): Promise<void> {
//       var calls = Util.FindElementRootCommandNode(this.Element).filter((x) =>
//         Util.IsEqual(x.getAttribute("core"), "call")
//       );
//       //while (calls.length > 0)
//       {
//         var commands: Array<ICommand> = [];
//         calls.forEach((element) =>
//           commands.push(CommandMaker.ToCommand(element))
//         );
//         var tasks = Array<Promise<void>>();
//         commands.forEach((command) => tasks.push(command.ExecuteAsync(context)));
//         await Promise.all(tasks);
//         // calls = Util.FindElementRootCommandNode(this.Element).filter((x) =>
//         //   Util.IsEqual(x.getAttribute("core"), "call")
//         // );
//       }
//     }

//     private async ReplaceNotationAsync(root: Element, context: IContext) {
//       if (root.nodeType == Node.TEXT_NODE) {
//         var token = await this.CheckContentForNotationAsync(root.textContent);
//         if (token) {
//           root.textContent = await Util.GetValueOrDefaultAsync(token, context);
//         }
//       } else {
//         for (var index = 0; index < root.attributes?.length ?? 0; index++) {
//           token = await this.CheckContentForNotationAsync(
//             root.attributes[index].value
//           );
//           if (token) {
//             root.attributes[index].value = await Util.GetValueOrDefaultAsync(
//               token,
//               context
//             );
//           }
//         }
//         root.childNodes.forEach((x) => {
//           if (!(x instanceof Element) || !(<Element>x).IsBasisCore()) {
//             this.ReplaceNotationAsync(<Element>x, context);
//           }
//         });
//       }
//     }

//     private CheckContentForNotationAsync(data: string): IToken<string> {
//       var token = data.ToStringToken();
//       return token instanceof StringObject || token instanceof StringArray
//         ? token
//         : null;
//     }
//   }
