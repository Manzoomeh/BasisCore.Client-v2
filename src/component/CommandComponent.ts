import IContext from "../context/IContext";
import {
  CallbackArgument,
  RenderedCallbackArgument,
  RenderingCallbackArgument,
} from "../CallbackArgument";
import { NonRangeableComponent } from "./NonRangeableComponent";

export default abstract class CommandComponent extends NonRangeableComponent<Element> {
  public readonly core: string;
  private onRenderingAsync: (args: RenderingCallbackArgument) => Promise<void>;
  private onRenderedAsync: (args: RenderedCallbackArgument) => Promise<void>;
  protected onProcessingAsync: (args: CallbackArgument) => Promise<void>;
  protected onProcessedAsync: (args: CallbackArgument) => Promise<void>;

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
      const renderingArgs =
        this.createCallbackArgument<RenderingCallbackArgument>({
          prevent: false,
        });
      await this.onRenderingAsync(renderingArgs);
      canRender = !renderingArgs.prevent;
    }
    let rendered = false;
    if (canRender) {
      rendered = await this.runAsync();
    }
    if (this.onRenderedAsync) {
      await this.onRenderedAsync(
        this.createCallbackArgument<RenderedCallbackArgument>({
          rendered: rendered,
        })
      );
    }
  }

  protected abstract runAsync(): Promise<boolean>;

  protected createCallbackArgument<T extends CallbackArgument>(
    data?: Partial<T>
  ): T {
    return {
      context: this.context,
      node: this.node,
      ...data,
    } as unknown as T;
  }
}
