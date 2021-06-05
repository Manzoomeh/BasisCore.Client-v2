import IContext from "../../../context/IContext";
import IToken from "../../../token/IToken";
import StringValue from "../../../token/string/StringValue";

export default class RawFace {
  readonly ApplyReplace: IToken<boolean>;
  readonly ApplyFunction: IToken<boolean>;
  readonly Level: IToken<string>;
  readonly RowType: IToken<string>;
  readonly Filter: IToken<string>;
  readonly Template: IToken<string>;

  constructor(element: Element, context: IContext) {
    this.ApplyReplace = element.GetBooleanToken("replace", context);
    this.ApplyFunction = element.GetBooleanToken("function", context);
    this.Level = element.GetStringToken("level", context);
    this.RowType = element.GetStringToken("rowtype", context);
    this.Filter = element.GetStringToken("filter", context);
    this.Template = new StringValue(element.GetTemplate(), context); // element.GetTemplateToken(context);
  }
}
