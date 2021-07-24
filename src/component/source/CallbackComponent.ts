import { inject, injectable } from "tsyringe";
import { SourceCallbackArgument } from "../../CallbackArgument";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import IToken from "../../token/IToken";
import CommandComponent from "../CommandComponent";

@injectable()
export default class CallbackComponent extends CommandComponent {
  readonly methodToken: IToken<string>;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext
  ) {
    super(element, context);
    this.allowMultiProcess = true;
    this.methodToken = this.getAttributeToken("method");
  }

  protected async runAsync(source?: ISource): Promise<any> {
    let retVal = true;
    let callbackFunction: (arg: ISource) => void = null;
    if (this.methodToken) {
      const methodName = await this.methodToken.getValueAsync();
      const method = eval(methodName);
      callbackFunction = (arg) => {
        const param = this.createCallbackArgument<SourceCallbackArgument>({
          source: arg,
        });
        try {
          Reflect.apply(method, null, [param]);
        } catch (e) {
          this.context.logger.logError(
            `error in execute callback method '${methodName}'.`,
            e
          );
          retVal = e;
        }
      };
    } else {
      callbackFunction = (arg) => {
        console.log(arg);
        console.table(arg?.rows);
      };
    }
    if (source) {
      callbackFunction(source);
    } else {
      this.triggers.forEach((sourceId) => {
        const source = this.context.tryToGetSource(sourceId);
        if (source) {
          callbackFunction(source);
        }
      });
    }
    return retVal;
  }
}
