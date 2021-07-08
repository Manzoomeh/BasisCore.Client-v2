import { HtmlCallbackArgument } from "../../CallbackArgument";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import { Priority } from "../../enum";
import { SourceId } from "../../type-alias";
import { ElementBaseComponent } from "../ElementBaseComponent";

export default abstract class HTMLComponent<
  TElement extends HTMLElement
> extends ElementBaseComponent<TElement> {
  protected triggers: string;
  readonly priority: Priority = Priority.None;

  constructor(element: TElement, context: IContext) {
    super(element, context);
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    const value = await this.getAttributeValueAsync("bc-triggers");
    if (value) {
      const triggers = value.split(" ");
      triggers?.forEach((type) =>
        this.node.addEventListener(type, this.onEventTriggerAsync.bind(this))
      );
    }
  }

  protected runAsync(source?: ISource): Promise<boolean> {
    return this.onEventTriggerAsync();
  }

  protected async onEventTriggerAsync(event?: Event): Promise<boolean> {
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
    this.context.setAsSource(id ?? "cms.unknown", value);
    if (this.onProcessedAsync) {
      const args = super.createCallbackArgument<HtmlCallbackArgument>({
        id: id,
        value: value,
      });
      await this.onProcessedAsync(args);
    }
    return true;
  }

  // protected async onEventTriggerAsync(event: Event) {
  //   event.preventDefault();
  //   if (!this.busy) {
  //     this._busy = true;
  //     try {
  //       const id = await this.getSourceIdAsync();
  //       const value = await this.getSourceValueAsync(event);
  //       this.context.setAsSource(id ?? "cms.unknown", value);
  //     } finally {
  //       this._busy = false;
  //     }
  //   }
  // }

  protected async getBcProperty(name: string): Promise<string> {
    let retVal = await this.getAttributeValueAsync(`bc-${name}`);
    if (!retVal) {
      retVal = await this.getAttributeValueAsync(name);
    }
    return retVal;
  }

  protected async getSourceIdAsync(): Promise<SourceId> {
    return this.getBcProperty("name");
  }

  protected async getSourceValueAsync(event: Event): Promise<any> {
    return this.getBcProperty("value");
  }
}
