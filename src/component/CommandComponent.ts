import IContext from "../context/IContext";
import { NonRangeableComponent } from "./NonRangeableComponent";

export default abstract class CommandComponent extends NonRangeableComponent<Element> {
  public readonly core: string;
  private TriggerBase: boolean = false;
  private readonly _initializeTask: Promise<void>;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.core = this.node.getAttribute("core");
    this._initializeTask = this.setTriggersAsync();
    console.log(`${this.core} - ctor`);
  }

  private async setTriggersAsync() {
    const value = await this.getAttributeValueAsync("bc-trigger-on");
    const keys = value?.split(" ");
    if (keys) {
      this.addTrigger(keys);
      this.TriggerBase = true;
    }
  }

  protected async getCanRenderAsync(context: IContext): Promise<boolean> {
    const token = this.node.GetBooleanToken("if", context);
    const value = await token?.getValueAsync();
    return value ?? true;
  }

  public initializeAsync(): Promise<void> {
    return this._initializeTask;
  }

  public async renderAsync(fromTrigger: boolean): Promise<void> {
    //if (!this.TriggerBase || fromTrigger)
    {
      const canRender = await this.getCanRenderAsync(this.context);
      console.log(`${this.core} - if`, canRender);
      if (canRender) {
        await this.runAsync();
      }
    }
  }
  protected abstract runAsync(): Promise<void>;
}
