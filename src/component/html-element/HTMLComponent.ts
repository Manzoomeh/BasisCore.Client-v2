import { HtmlCallbackArgument } from "../../CallbackArgument";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import { Priority } from "../../enum";
import { SourceId } from "../../type-alias";
import ElementBaseComponent from "../ElementBaseComponent";

export default abstract class HTMLComponent<
  TElement extends HTMLElement
> extends ElementBaseComponent<TElement> {
  protected triggers: string;
  readonly priority: Priority = Priority.none;

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
    this.context.setAsSource(id ?? "cms.unknown", value);
    if (this.onProcessedAsync) {
      const args = super.createCallbackArgument<HtmlCallbackArgument>({
        id: id,
        value: value,
      });
      await this.onProcessedAsync(args);
    }
  }

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
