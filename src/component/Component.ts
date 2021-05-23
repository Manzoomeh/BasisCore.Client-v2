import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import { SourceId } from "../type-alias";
import IComponent from "./IComponent";

export default abstract class Component<TNode extends Node>
  implements IComponent
{
  readonly node: TNode;
  readonly context: IContext;

  constructor(node: TNode, context: IContext) {
    this.node = node;
    this.context = context;
  }

  protected addDataSourceToWatchList(sourceIds: SourceId | Array<SourceId>) {
    if (typeof sourceIds === "string") {
      // this.context.Repository.addHandler(sourceIds, (x) =>
      //   this.onDataSourceAdded(x)
      // );
      this.context.Repository.addHandler(
        sourceIds,
        this.onDataSourceAdded.bind(this)
      );
    } else {
      sourceIds.forEach((sourceId) =>
        this.context.Repository.addHandler(
          sourceId,
          this.onDataSourceAdded.bind(this)
        )
      );
    }
  }

  protected onDataSourceAdded(dataSource: IDataSource): void {}
}
