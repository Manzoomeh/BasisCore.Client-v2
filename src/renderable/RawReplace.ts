import IContext from "../context/IContext";
import IToken from "../token/IToken";

export default class RawReplace {
  TagName: IToken<string>;
  Content: IToken<string>;

  constructor(element: Element, context: IContext) {
    this.TagName = element.GetStringToken("tagname", context);
    this.Content = element.GetTemplateToken(context);
  }
}
