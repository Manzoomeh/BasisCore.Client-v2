import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import IComponent from "./IComponent";

export default abstract class Component<TNode extends Node>
  implements IComponent
{
  readonly node: TNode;
  readonly context: IContext;

  constructor(node: TNode, context: IContext) {
    this.node = node;
    this.context = context;
    context.Repository.addHandler((x) => this.onDataSourceAdded(x));
  }

  protected onDataSourceAdded(dataSource: IDataSource): void {}
}
