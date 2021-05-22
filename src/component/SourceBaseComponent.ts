import IContext from "../context/IContext";
import CommandComponnect from "./CommandComponent";

export default abstract class SourceBaseComponent extends CommandComponnect {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  public async getSourceNamesAsync(): Promise<Array<string>> {
    return [await this.getAttributeValueAsync("datamembername", this.context)];
  }
}
