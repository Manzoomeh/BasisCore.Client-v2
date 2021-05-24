import IContext from "../context/IContext";
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

  protected addTrigger(sourceIds: Array<SourceId>) {
    sourceIds.forEach((sourceId) =>
      this.context.repository.addHandler(sourceId, (x) => this.onTrigger())
    );
  }

  protected onTrigger(): void {}
}

export class ComponentList {
  readonly node: NodeListOf<ChildNode>;
  readonly context: IContext;

  constructor(nodeList: NodeListOf<ChildNode>, context: IContext) {
    this.node = nodeList;
    this.context = context;
  }
}
