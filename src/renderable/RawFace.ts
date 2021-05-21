import IToken from "../token/IToken";

export default class RawFace {
  readonly ApplyReplace: IToken<boolean>;
  readonly ApplyFunction: IToken<boolean>;
  readonly Level: IToken<string>;
  readonly RowType: IToken<string>;
  readonly Filter: IToken<string>;
  readonly Template: IToken<string>;

  constructor(element: Element) {
    this.ApplyReplace = element.GetBooleanToken("replace");
    this.ApplyFunction = element.GetBooleanToken("function");
    this.Level = element.GetStringToken("level");
    this.RowType = element.GetStringToken("rowtype");
    this.Filter = element.GetStringToken("filter");
    this.Template = element.GetTemplateToken();
  }
}
