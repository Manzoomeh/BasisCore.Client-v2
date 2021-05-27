import IContext from "../../../context/IContext";
import IData from "../../../data/IData";
import { SourceId } from "../../../type-alias";
import Member from "./Member";

export default abstract class InMemoryMember extends Member {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }
  async AddDataSourceExAsync(sourceId: SourceId): Promise<void> {
    var source = await this.ParseDataAsync(this.context);
    if (source) {
      super.addDataSourceAsync(source, sourceId);
    }
  }

  abstract ParseDataAsync(context: IContext): Promise<IData>;
}
