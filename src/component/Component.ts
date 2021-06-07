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

  protected onRendering: (node: TNode) => boolean;
  protected onRendered: (node: TNode) => void;

  constructor(node: TNode, context: IContext) {
    this.node = node;
    this.context = context;
  }
  public async processAsync(): Promise<void> {
    if (!this.busy) {
      this._busy = true;
      try {
        if (!this.onRendering || this.onRendering(this.node)) {
          await this.renderAsync();
          if (this.onRendered) {
            this.onRendered(this.node);
          }
        }
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
