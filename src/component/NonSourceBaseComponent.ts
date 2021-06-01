import IContext from "../context/IContext";
import CommandComponent from "./CommandComponent";

export default abstract class NonSourceBaseComponent extends CommandComponent {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  public async renderAsync(fromTrigger: boolean): Promise<void> {
    if (!this.TriggerBase || fromTrigger) {
      const canRender = await this.getCanRenderAsync(this.context);
      console.log("NonSourceBaseComponent.if", canRender);
      if (canRender) {
        await this.runAsync();
      }
    }
  }
  protected abstract runAsync(): Promise<void>;
}
