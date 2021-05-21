import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import IComponent from "./IComponent";

export default abstract class Component implements IComponent {
  readonly node: Node;
  readonly context: IContext;

  constructor(node: Node, context: IContext) {
    this.node = node;
    this.context = context;
    context.Repository.addHandler((x) => this.onDataSourceAdded(x));
  }

  protected onDataSourceAdded(dataSource: IDataSource): void {}
}
