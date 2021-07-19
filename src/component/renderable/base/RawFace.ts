import IContext from "../../../context/IContext";
import IToken from "../../../token/IToken";
import Util from "../../../Util";

export default class RawFace {
  // readonly ApplyReplace: IToken<boolean>;
  // readonly ApplyFunction: IToken<boolean>;
  readonly Level: IToken<string>;
  readonly RowType: IToken<string>;
  readonly Filter: IToken<string>;
  readonly Template: string;

  constructor(element: Element, context: IContext, placeHolder?: string) {
    // this.ApplyReplace = element.GetBooleanToken("replace", context);
    // this.ApplyFunction = element.GetBooleanToken("function", context);
    this.Level = element.GetStringToken("level", context);
    this.RowType = element.GetStringToken("rowtype", context);
    this.Filter = element.GetStringToken("filter", context);
    this.Template = element.getTemplate();
    if (placeHolder) {
      this.Template = Util.ReplaceEx(
        this.Template,
        `@child`,
        `<basis-core-template-tag data-type="${placeHolder}"><basis-core-template-tag/>`
      );
    }
  }
}
