import { inject, injectable } from "tsyringe";
import { SourceCallbackArgument } from "../../CallbackArgument";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import { Priority } from "../../enum";
import IToken from "../../token/IToken";
import CommandComponent from "../CommandComponent";

@injectable()
export default class CallbackComponent extends CommandComponent {
  readonly priority: Priority = Priority.none;
  readonly methodToken: IToken<string>;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext
  ) {
    super(element, context);
    this.allowMultiProcess = true;
    this.methodToken = this.getAttributeToken("method");
  }

  protected async runAsync(source?: ISource): Promise<boolean> {
    let retVal = true;
    if (this.methodToken) {
      const methodName = await this.methodToken.getValueAsync();
      const method = eval(methodName);
      const arg = this.createCallbackArgument<SourceCallbackArgument>({
        source: source,
      });
      try {
        Reflect.apply(method, null, [arg]);
      } catch (e) {
        this.context.logger.logError(
          `error in execute callback method '${methodName}'.`,
          e
        );
        retVal = false;
      }
    } else {
      console.log(source);
      console.table(source?.rows);
    }
    return retVal;
  }
}
