import {
  HtmlCallbackArgument,
  RenderedCallbackArgument,
  RenderingCallbackArgument,
} from "../../CallbackArgument";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import Source from "../../data/Source";
import { MergeType, Priority } from "../../enum";
import IToken from "../../token/IToken";
import { SourceId } from "../../type-alias";
import ElementBaseComponent from "../ElementBaseComponent";

export default abstract class HTMLComponent<
  TElement extends HTMLElement
> extends ElementBaseComponent<TElement> {
  protected eventTriggers: Array<string>;
  readonly priority: Priority = Priority.none;
  readonly keyFieldNameToken: IToken<string>;
  readonly statusFieldNameToken: IToken<string>;
  readonly mergeTypeToken: IToken<string>;
  readonly eventHandler: EventListenerOrEventListenerObject;

  constructor(element: TElement, context: IContext) {
    super(element, context);
    this.keyFieldNameToken = this.getAttributeToken("bc-keyField");
    this.statusFieldNameToken = this.getAttributeToken("bc-statusField");
    this.mergeTypeToken = this.getAttributeToken("bc-merge");
    this.eventHandler = this.onEventTriggerAsync.bind(this);
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    const value = await this.getAttributeValueAsync("bc-triggers");
    const init = this.node.hasAttribute("data-bc-init");
    if (value && !init) {
      this.eventTriggers = value.split(" ");
      this.eventTriggers?.forEach((eventName) =>
        this.node.addEventListener(eventName, this.eventHandler)
      );
      this.node.setAttribute("data-bc-init", "");
    }
  }

  protected runAsync(source?: ISource): Promise<void> {
    return this.onEventTriggerAsync();
  }

  protected async onEventTriggerAsync(event?: Event): Promise<void> {
    event?.preventDefault();
    let id = await this.getSourceIdAsync();
    let value = await this.getSourceValueAsync(event);
    if (this.onProcessingAsync) {
      const args = super.createCallbackArgument<HtmlCallbackArgument>({
        id: id,
        value: value,
      });
      await this.onProcessingAsync(args);
      id = args.id;
      value = args.value;
    }
    let mergeType;
    if (this.mergeTypeToken) {
      const rawValue = await this.mergeTypeToken.getValueAsync();
      if (rawValue) {
        mergeType = MergeType[rawValue.toLowerCase()];
      }
    }
    var source = new Source(id ?? "cms.unknown", value, {
      keyFieldName: await this.keyFieldNameToken?.getValueAsync(),
      statusFieldName: await this.statusFieldNameToken?.getValueAsync(),
      mergeType: mergeType,
    });
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

    if (canRender) {
      this.context.setSource(source);
      if (this.onRenderedAsync) {
        await this.onRenderedAsync(
          this.createCallbackArgument<RenderedCallbackArgument>({
            result: null,
            source: source,
          })
        );
      }
    }
    if (this.onProcessedAsync) {
      const args = super.createCallbackArgument<HtmlCallbackArgument>({
        id: id,
        value: value,
      });
      await this.onProcessedAsync(args);
    }
  }

  protected async getSourceIdAsync(): Promise<SourceId> {
    let retVal = await this.getAttributeValueAsync(`bc-name`);
    if (!retVal) {
      retVal = await this.getAttributeValueAsync("name");
    }
    return retVal;
  }

  protected async getSourceValueAsync(event: Event): Promise<any> {
    let retVal = await this.getAttributeValueAsync(`bc-value`);
    if (!retVal) {
      try {
        retVal = (this.node as any).value;
      } catch {
        /*Nothing*/
      }
    }
    return retVal;
  }

  public disposeAsync(): Promise<void> {
    this.eventTriggers?.forEach((eventName) =>
      this.node.removeEventListener(eventName, this.eventHandler)
    );
    this.node.removeAttribute("data-bc-init");
    return super.disposeAsync();
  }
}
