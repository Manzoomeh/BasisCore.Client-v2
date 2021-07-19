import { HtmlCallbackArgument } from "../../CallbackArgument";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import { MergeType, Priority } from "../../enum";
import IToken from "../../token/IToken";
import { SourceId } from "../../type-alias";
import ElementBaseComponent from "../ElementBaseComponent";

export default abstract class HTMLComponent<
  TElement extends HTMLElement
> extends ElementBaseComponent<TElement> {
  protected triggers: string;
  readonly priority: Priority = Priority.none;
  readonly keyFieldNameToken: IToken<string>;
  readonly statusFieldNameToken: IToken<string>;
  readonly mergeTypeToken: IToken<string>;

  constructor(element: TElement, context: IContext) {
    super(element, context);
    this.keyFieldNameToken = this.getAttributeToken("bc-keyField");
    this.statusFieldNameToken = this.getAttributeToken("bc-statusField");
    this.mergeTypeToken = this.getAttributeToken("bc-merge");
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
    let mergeType;
    if (this.mergeTypeToken) {
      const rawValue = await this.mergeTypeToken.getValueAsync();
      if (rawValue) {
        mergeType = MergeType[rawValue.toLowerCase()];
      }
    }

    this.context.setAsSource(id ?? "cms.unknown", value, {
      keyFieldName: await this.keyFieldNameToken?.getValueAsync(),
      statusFieldName: await this.statusFieldNameToken?.getValueAsync(),
      mergeType: mergeType,
    });
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
