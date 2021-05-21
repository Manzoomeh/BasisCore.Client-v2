import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import Command from "./Command";

export default abstract class SourceBaseCommand extends Command {
  constructor(element: Element) {
    super(element);
  }

  public async getSourceNamesAsync(context: IContext): Promise<Array<string>> {
    return [await this.getAttributeValueAsync("datamembername", context)];
  }

  abstract renderAsync(
    dataSource: IDataSource,
    context: IContext
  ): Promise<string>;
}
