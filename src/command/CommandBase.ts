// import { RenderType } from "../enum";
// import ClientException from "../exception/ClientException";
// import IContext from "../intrface/IContext";
// import IToken from "../token/IToken";
// import Util from "../Util";
// import ICommand from "./ICommand";

// export default abstract class CommandBase implements ICommand {
//   readonly lookup: Map<string, any> = new Map();
//   constructor(element: Element) {
//     this.Element = element;
//   }
//   readonly Element: Element;

//   async ExecuteAsync(context: IContext): Promise<void> {
//     try {
//       if (await this.If) {
//         await this.ExecuteCommandAsync(context);
//       }
//     } catch (ex) {
//       await this.ApplyResultAsync(ex, context, true);
//       context.DebugContext.LogError(
//         `Error In Run '${this.Core ?? "Content"}'`,
//         ex
//       );
//     }
//   }
//   protected ExecuteCommandAsync(renderingTurn: IContext): Promise<void> {
//     throw new Error("'ExecuteCommandAsync' Not Implemented");
//   }

//   protected async ApplyResultAsync(
//     result: string,
//     context: IContext,
//     replace: boolean
//   ): Promise<void> {
//     this.ReplaceElement(this.Element, result);
//   }

//   private ReplaceElement(container: Element, tagString: string) {
//     try {
//       var range = document.createRange();
//       range.selectNode(container.parentElement);
//       var documentFragment = range.createContextualFragment(tagString);
//       container.parentElement.replaceChild(documentFragment, container);
//     } catch (err) {
//       console.error(err);
//     }
//   }

//   private AppendContent(container: Element, tagString: string) {
//     try {
//       var range = document.createRange();
//       range.selectNode(container);
//       var documentFragment = range.createContextualFragment(tagString);
//       container.appendChild(documentFragment);
//     } catch (err) {
//       console.error(err);
//     }
//   }
//   private ReplaceContent(container: Element, tagString: string) {
//     try {
//       var range = document.createRange();
//       range.selectNode(container);
//       var documentFragment = range.createContextualFragment(tagString);
//       container.innerHTML = "";
//       container.appendChild(documentFragment);
//     } catch (err) {
//       console.error(err);
//     }
//   }

//   protected async GetAttributeValueAsync(
//     attributeName: string,
//     turnContext: IContext,
//     defaultValue: string = null
//   ): Promise<string> {
//     var token = this.Element.GetStringToken(attributeName);
//     return (await token?.GetValueAsync(turnContext)) || defaultValue;
//   }

//   protected async StopRenderingAsync(): Promise<void> {}

//   get If(): Promise<boolean> {
//     return this.GetAttribute<boolean>(
//       "if",
//       true,
//       RenderingTurnContext.BooleanConvertorAsync
//     );
//   }

//   private async GetAttribute<T>(
//     attributeName: string,
//     defaultValue: T,
//     convertor: (
//       token: IToken<string>,
//       context: IContext,
//       defaultValue: T
//     ) => Promise<T>
//   ): Promise<T> {
//     var retVal = this.lookup.get(attributeName);
//     if (retVal === undefined) {
//       var token = this.Element.GetStringToken(attributeName);
//       retVal = await convertor(token, this.Context, defaultValue);
//       this.lookup.set(attributeName, retVal);
//     }
//     return retVal;
//   }
// }
