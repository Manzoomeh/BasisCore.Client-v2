import IContext from "../context/IContext";
import ISource from "../data/ISource";
import { Priority } from "../enum";
import { SourceHandler, SourceId } from "../type-alias";
import IComponent from "./IComponent";

export default abstract class Component<TNode extends Node>
  implements IComponent
{
  private readonly _handler: SourceHandler;
  private readonly _handlingSource: Array<SourceId> = new Array<SourceId>();
  readonly node: TNode;
  readonly context: IContext;
  readonly priority: Priority = Priority.low;
  protected allowMultiProcess: boolean = false;
  private _busy: boolean = false;
  public get disposed(): boolean {
    return this._disposed;
  }
  private _disposed: boolean = false;

  public get busy(): boolean {
    return this._busy;
  }

  constructor(node: TNode, context: IContext) {
    this.node = node;
    this.context = context;
    this._handler = this.onTrigger.bind(this);
  }

  public processAsync(): Promise<void> {
    return this.onTrigger(null);
  }

  protected async onTrigger(source?: ISource): Promise<void> {
    if (!this._disposed && (!this._busy || this.allowMultiProcess)) {
      this._busy = true;
      try {
        await this.renderAsync(source);
      } finally {
        this._busy = false;
      }
    }
  }

  public addTrigger(sourceIds: Array<SourceId>) {
    sourceIds?.forEach((sourceId) => {
      if (this._handlingSource.indexOf(sourceId) === -1) {
        this.context.addOnSourceSetHandler(sourceId, this._handler);
        this._handlingSource.push(sourceId);
      }
    });
  }

  public disposeAsync(): Promise<void> {
    this._handlingSource.forEach((sourceId) => {
      this.context.removeOnSourceSetHandler(sourceId, this._handler);
    });
    this._disposed = true;
    return Promise.resolve();
  }

  abstract initializeAsync(): Promise<void>;
  abstract renderAsync(source?: ISource): Promise<void>;
}
