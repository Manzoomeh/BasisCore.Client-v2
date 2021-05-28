import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import IDataSource from "../../data/IDataSource";
import SourceBaseComponent from "../SourceBaseComponent";

@injectable()
export default class CallbackComponent extends SourceBaseComponent {
  protected async renderSourceAsync(dataSource: IDataSource): Promise<Node> {
    var methodName = await this.getAttributeValueAsync("method");
    var method = eval(methodName);
    try {
      method(dataSource);
    } catch (e) {
      this.context.logger.LogError(
        `error in execute callback method '${methodName}'.`,
        e
      );
    }
    return null;
  }
}
