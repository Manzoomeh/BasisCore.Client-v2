import IContext from "../context/IContext";
import CommandComponnect from "./CommandComponent";

export default abstract class SourceBaseComponent extends CommandComponnect {
  constructor(element: Element, context: IContext) {
    super(element, context);
    this.getAttributeValueAsync("datamembername").then((x) =>
      this.addDataSourceToWatchList(x)
    );
  }
}
