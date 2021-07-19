import {
  RenderingCallbackArgument,
  RenderedCallbackArgument,
  CallbackArgument,
} from "../CallbackArgument";
import IContext from "../context/IContext";
import ISource from "../data/ISource";
import IToken from "../token/IToken";
import Component from "./Component";

export default abstract class ElementBaseComponent<
  TElement extends Element
> extends Component<TElement> {
  protected onRenderingAsync: (
    args: RenderingCallbackArgument
  ) => Promise<void>;
  protected onRenderedAsync: (args: RenderedCallbackArgument) => Promise<void>;
  protected onProcessingAsync: (args: CallbackArgument) => Promise<void>;
  protected onProcessedAsync: (args: CallbackArgument) => Promise<void>;

  protected ifToken: IToken<string>;
  constructor(element: TElement, context: IContext) {
    super(element, context);
  }

  public async initializeAsync(): Promise<void> {
    this.ifToken = this.getAttributeToken("if");
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

  protected async getIfValueAsync(): Promise<boolean> {
    const rawValue = await this.ifToken?.getValueAsync();
    let retVal = true;
    if (rawValue != null && rawValue != undefined) {
      const fn: () => boolean = new Function(
        `try{return ${rawValue};}catch{return false;}`
      ) as any;
      retVal = fn();
    }
    return retVal;
  }

  public async renderAsync(source?: ISource): Promise<void> {
    let canRender = await this.getIfValueAsync();
    if (canRender && this.onRenderingAsync) {
      const renderingArgs =
        this.createCallbackArgument<RenderingCallbackArgument>({
          prevent: false,
          source: source,
        });
      await this.onRenderingAsync(renderingArgs);
      canRender = !renderingArgs.prevent;
    }
    let runResult: any = null;
    if (canRender) {
      runResult = await this.runAsync(source);
      if (runResult !== null && this.onRenderedAsync) {
        await this.onRenderedAsync(
          this.createCallbackArgument<RenderedCallbackArgument>({
            result: runResult,
            source: source,
          })
        );
      }
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

  protected abstract runAsync(source?: ISource): Promise<any>;
}
