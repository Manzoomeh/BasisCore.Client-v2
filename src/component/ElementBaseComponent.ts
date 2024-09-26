import {
  RenderingCallbackArgument,
  RenderedCallbackArgument,
  CallbackArgument,
} from "../CallbackArgument";
import IContext from "../context/IContext";
import ISource from "../data/ISource";
import Source from "../data/Source";
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
  protected isHide: boolean = false;

  private _triggers: string[];
  public get triggers(): string[] {
    return this._triggers;
  }
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
    if (value) {
      this._triggers = value?.split(" ");
      this.addTrigger(this._triggers);
    }
    const events = await this.getAttributeValueAsync("events");
    console.log(events);
    if (events) {
      const preventDefault = await this.getAttributeBooleanValueAsync(
        "preventDefault",
        false
      );
      const stopPropagation = await this.getAttributeBooleanValueAsync(
        "stopPropagation",
        false
      );
      events.split(" ").forEach((item) => {
        const [type, event] = item.split(".", 2);
        const callback = (x: Event) => {
          if (preventDefault) {
            x.preventDefault();
          }
          if (stopPropagation) {
            x.stopPropagation();
          }
          const source = new Source(item, x);
          this.renderAsync(source);
        };
        const timerCallback = (obj) => {
          const source = new Source(item, obj.id);
          this.renderAsync(source);
        };
        console.log(type.toLowerCase());
        switch (type.toLowerCase()) {
          case "document": {
            document.addEventListener(event, callback);
            break;
          }
          case "window": {
            window.addEventListener(event, callback);
            break;
          }
          case "timer": {
            console.log(type.toLowerCase());
            const timerId = setInterval(() => {
              const source = new Source(item, timerId);
              this.renderAsync(source);
            }, parseInt(event));
            break;
          }
          default:
            document
              .querySelectorAll(type)
              .forEach((element) => element.addEventListener(event, callback));
            break;
        }
      });
    }
  }

  protected async getIfValueAsync(): Promise<boolean> {
    const rawValue = await this.ifToken?.getValueAsync();
    let retVal = true;
    if (rawValue != null && rawValue != undefined) {
      try {
        const fn: () => boolean = new Function(
          `try{return ${rawValue};}catch{return false;}`
        ) as any;
        retVal = fn();
      } catch (e) {
        console.error(
          `Error in parse 'if' attribute expression in command: '${rawValue}'`
        );
        throw e;
      }
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
      this.isHide = false;
      if (runResult !== null && this.onRenderedAsync) {
        await this.onRenderedAsync(
          this.createCallbackArgument<RenderedCallbackArgument>({
            result: runResult,
            source: source,
          })
        );
      }
    } else if (!this.isHide) {
      await this.hideAsync();
      this.isHide = true;
    }
  }

  public async getAttributeValueAsync(
    attributeName: string,
    defaultValue: string = null
  ): Promise<string> {
    const token = this.getAttributeToken(attributeName);
    return (await token?.getValueAsync()) ?? defaultValue;
  }

  public async getAttributeObjectValueAsync(
    attributeName: string,
    defaultValue: any = null
  ): Promise<any> {
    const token = this.node.GetObjectToken(attributeName, this.context);
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
  protected async hideAsync(): Promise<void> {
    return Promise.resolve();
  }

  public disposeAsync(): Promise<void> {
    return super.disposeAsync();
  }
}
