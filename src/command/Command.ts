// import IContext from "../context/IContext";
// //import ICommand from "./ICommand";

// export default abstract class Command {
//   readonly Element: Element;
//   constructor(element: Element) {
//     this.Element = element;
//   }
//   //abstract ExecuteAsync(context: IContext): Promise<void>;

//   protected async getAttributeValueAsync(
//     attributeName: string,
//     context: IContext,
//     defaultValue: string = null
//   ): Promise<string> {
//     var token = this.Element.GetStringToken(attributeName, context);
//     return (await token?.getValueAsync(context)) ?? defaultValue;
//   }
// }
