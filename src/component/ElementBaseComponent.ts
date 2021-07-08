import {
  RenderingCallbackArgument,
  RenderedCallbackArgument,
  CallbackArgument,
} from "../CallbackArgument";
import IContext from "../context/IContext";
import ISource from "../data/ISource";
import IToken from "../token/IToken";
import Component from "./Component";

export abstract class ElementBaseComponent<
  TElement extends Element
> extends Component<TElement> {
  protected onRenderingAsync: (
    args: RenderingCallbackArgument
  ) => Promise<void>;
  protected onRenderedAsync: (args: RenderedCallbackArgument) => Promise<void>;
  protected onProcessingAsync: (args: CallbackArgument) => Promise<void>;
  protected onProcessedAsync: (args: CallbackArgument) => Promise<void>;

  constructor(element: TElement, context: IContext) {
    super(element, context);
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

  public async renderAsync(source?: ISource): Promise<void> {
    const token = this.node.GetBooleanToken("if", this.context);
    let canRender = (await token?.getValueAsync()) ?? true;
    if (canRender && this.onRenderingAsync) {
      const renderingArgs =
        this.createCallbackArgument<RenderingCallbackArgument>({
          prevent: false,
          source: source,
        });
      await this.onRenderingAsync(renderingArgs);
      canRender = !renderingArgs.prevent;
    }
    let rendered = false;
    if (canRender) {
      rendered = await this.runAsync(source);
    }
    if (this.onRenderedAsync) {
      await this.onRenderedAsync(
        this.createCallbackArgument<RenderedCallbackArgument>({
          rendered: rendered,
          source: source,
        })
      );
    }
  }

  public async getAttributeValueAsync(
    attributeName: string,
    defaultValue: string = null
  ): Promise<string> {
    const token = this.getAttributeToken(attributeName);
    return (await token?.getValueAsync()) ?? defaultValue;
  }

  public async getAttributeBooleanValueAsync(
    attributeName: string,
    defaultValue: boolean = false
  ): Promise<Boolean> {
    const token = this.node.GetBooleanToken(attributeName, this.context);
    return (await token?.getValueAsync()) ?? defaultValue;
  }

  public getAttributeToken(attributeName: string): IToken<string> {
    return this.node.GetStringToken(attributeName, this.context);
  }

  protected createCallbackArgument<T extends CallbackArgument>(
    data?: Partial<T>
  ): T {
    return {
      context: this.context,
      node: this.node,
      ...data,
    } as unknown as T;
  }

  protected abstract runAsync(source?: ISource): Promise<boolean>;
}
