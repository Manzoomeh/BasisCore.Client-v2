import IContext from "../context/IContext";
import CommandComponent from "./CommandComponent";

export abstract class NonSourceBaseComponent extends CommandComponent {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  protected onTrigger(): void {
    this.canRenderCommandAsync(this.context).then((x) => {
      if (x) {
        this.runAsync();
      }
    });
  }

  public renderAsync(): Promise<void> {
    if (!this.TriggerBase) {
      return this.canRenderCommandAsync(this.context).then((x) => {
        if (x) {
          this.runAsync();
        }
      });
    }
  }
  protected abstract runAsync(): Promise<void>;
}
