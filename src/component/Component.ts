import IContext from "../context/IContext";
import ISource from "../data/ISource";
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
  public processAsync(): Promise<void> {
    return this.onTrigger();
  }

  protected async onTrigger(source?: ISource): Promise<void> {
    if (!this._busy) {
      this._busy = true;
      try {
        await this.renderAsync(source);
      } finally {
        this._busy = false;
      }
    }
  }

  public addTrigger(sourceIds: Array<SourceId>) {
    sourceIds?.forEach((sourceId) =>
      this.context.addOnSourceSetHandler(sourceId, this.onTrigger.bind(this))
    );
  }

  abstract initializeAsync(): Promise<void>;
  abstract renderAsync(source?: ISource): Promise<void>;
}
