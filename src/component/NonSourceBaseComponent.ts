import IContext from "../context/IContext";
import IDataSource from "../data/IDataSource";
import CommandComponnect from "./CommandComponent";

export abstract class NonSourceBaseComponent extends CommandComponnect {
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
