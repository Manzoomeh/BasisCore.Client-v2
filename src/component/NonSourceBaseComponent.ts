import IContext from "../context/IContext";
import CommandComponnect from "./CommandComponent";

export abstract class NonSourceBaseComponent extends CommandComponnect {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  public abstract runAsync(): Promise<string>;
}
