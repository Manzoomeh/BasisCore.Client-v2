import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import CommandComponnect from "./CommandComponent";

export abstract class NonSourceBaseComponent extends CommandComponnect {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  protected renderAsync(_: IDataSource): Promise<string> {
    return this.runAsync();
  }
  public abstract runAsync(): Promise<string>;
}
