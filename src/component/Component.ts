import IContext from "../context/IContext";
import { Priority } from "../enum";
import { SourceId } from "../type-alias";
import IComponent from "./IComponent";

export default abstract class Component<TNode extends Node>
  implements IComponent
{
  readonly node: TNode;
  readonly context: IContext;
  readonly priority: Priority = Priority.normal;
  protected _busy: boolean = false;
  public get busy(): boolean {
    return this._busy;
  }

  constructor(node: TNode, context: IContext) {
    this.node = node;
    this.context = context;
  }
  public async processAsync(): Promise<void> {
    if (!this.busy) {
      this._busy = true;
      try {
        await this.renderAsync();
      } finally {
        this._busy = false;
      }
    }
  }

  protected addTrigger(sourceIds: Array<SourceId>) {
    sourceIds.forEach((sourceId) =>
      this.context.addOnSourceSetHandler(sourceId, (x) => this.processAsync())
    );
  }

  abstract initializeAsync(): Promise<void>;
  abstract renderAsync(): Promise<void>;
}
