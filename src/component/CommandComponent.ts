import IContext from "../context/IContext";
import { NonRangeableComponent } from "./NonRangeableComponent";

export default abstract class CommandComponent extends NonRangeableComponent<Element> {
  public readonly core: string;
  private onRendering: (param: any) => boolean;
  constructor(element: Element, context: IContext) {
    super(element, context);
    this.core = this.node.getAttribute("core");
    //console.log(`${this.core} - ctor`);
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    const onRendering = await this.getAttributeValueAsync("OnRendering");
    if (onRendering) {
      try {
        this.onRendering = new Function(
          "param",
          `return ${onRendering}(param);`
        ) as any;
      } catch {
        /*nothing*/
      }
    }
    const value = await this.getAttributeValueAsync("triggers");
    const keys = value?.split(" ");
    if (keys) {
      this.addTrigger(keys);
    }
  }

  protected async getCanRenderAsync(context: IContext): Promise<boolean> {
    const token = this.node.GetBooleanToken("if", context);
    const value = await token?.getValueAsync();
    return value ?? true;
  }

  public async renderAsync(): Promise<boolean> {
    let rendered = false;
    const canRender = await this.getCanRenderAsync(this.context);
    //console.log(`${this.core} - if`, canRender);
    if (canRender) {
      if (!this.onRendering || this.onRendering(this.node)) {
        rendered = await this.runAsync();
      }
    }
    return rendered;
  }
  protected abstract runAsync(): Promise<boolean>;
}
