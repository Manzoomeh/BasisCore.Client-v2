import IContext from "../context/IContext";
import { CallbackArgument, RenderingCallbackArgument } from "../type-alias";
import { NonRangeableComponent } from "./NonRangeableComponent";

export default abstract class CommandComponent extends NonRangeableComponent<Element> {
  public readonly core: string;
  private onRenderingAsync: (args: Partial<RenderingCallbackArgument>) => void;
  private onRenderedAsync: (args: Partial<CallbackArgument>) => void;
  private onProcessingAsync: (args: Partial<CallbackArgument>) => void;
  private onProcessedAsync: (args: Partial<CallbackArgument>) => void;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.core = this.node.getAttribute("core");
  }

  public async initializeAsync(): Promise<void> {
    const onRendering = await this.getAttributeValueAsync("OnRendering");
    if (onRendering) {
      this.onRenderingAsync = new Function(
        "callbackArgument",
        `return ${onRendering}(callbackArgument);`
      ) as any;
    }

    const onRendered = await this.getAttributeValueAsync("OnRendered");
    if (onRendered) {
      this.onRenderedAsync = new Function(
        "callbackArgument",
        `return ${onRendered}(callbackArgument);`
      ) as any;
    }

    const onProcessing = await this.getAttributeValueAsync("OnProcessing");
    if (onProcessing) {
      this.onProcessingAsync = new Function(
        "callbackArgument",
        `return ${onProcessing}(callbackArgument);`
      ) as any;
    }

    const onProcessed = await this.getAttributeValueAsync("OnProcessed");
    if (onProcessed) {
      this.onProcessedAsync = new Function(
        "callbackArgument",
        `return ${onProcessed}(callbackArgument);`
      ) as any;
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

  public async renderAsync(): Promise<void> {
    let canRender = await this.getCanRenderAsync(this.context);
    if (canRender && this.onRenderingAsync) {
      let renderingArgs =
        this.createCallbackArgument<RenderingCallbackArgument>();
      renderingArgs.prevent = false;
      await this.onRenderingAsync(renderingArgs);
      canRender = !renderingArgs.prevent;
    }
    if (canRender) {
      const rendered = await this.runAsync();
      if (rendered && this.onRenderedAsync) {
        await this.onRenderedAsync(this.createCallbackArgument());
      }
    }
  }
  protected abstract runAsync(): Promise<boolean>;

  protected createCallbackArgument<T extends CallbackArgument>(): Partial<T> {
    return {
      context: this.context,
      node: this.node,
    } as unknown as Partial<T>;
  }
}
