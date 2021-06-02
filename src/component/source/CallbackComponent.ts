import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import { Priority } from "../../enum";
import SourceBaseComponent from "../SourceBaseComponent";

@injectable()
export default class CallbackComponent extends SourceBaseComponent {
  readonly priority: Priority = Priority.normal;
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context, container);
  }
  protected async renderSourceAsync(dataSource: ISource): Promise<Node> {
    var methodName = await this.getAttributeValueAsync("method");
    var method = eval(methodName);
    try {
      method(dataSource);
    } catch (e) {
      this.context.logger.logError(
        `error in execute callback method '${methodName}'.`,
        e
      );
    }
    return null;
  }
}
