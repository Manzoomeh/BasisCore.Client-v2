import IContext from "../../context/IContext";
import { AppendType } from "../../enum";
import { SourceId } from "../../type-alias";
import { NonRangeableComponent } from "../NonRangeableComponent";

export default abstract class HTMLElementComponent<
  TElement extends HTMLElement
> extends NonRangeableComponent<TElement> {
  protected triggers: string;
  constructor(element: TElement, context: IContext) {
    super(element, context);
  }

  public async initializeAsync(): Promise<void> {
    const value = await this.getAttributeValueAsync("bc-triggers");
    if (value) {
      const triggers = value.split(" ");
      triggers?.forEach((type) =>
        this.node.addEventListener(type, this.onEventTriggerAsync.bind(this))
      );
    }
  }

  renderAsync(): Promise<void> {
    return Promise.resolve();
  }

  protected async onEventTriggerAsync(event: Event) {
    event.preventDefault();
    if (!this.busy) {
      this._busy = true;
      try {
        const id = await this.getSourceIdAsync();
        const value = await this.getSourceValueAsync(event);
        this.context.setAsSource(
          id ?? "cms.unknown",
          value,
          AppendType.replace
        );
      } finally {
        this._busy = false;
      }
    }
  }

  protected async getSourceIdAsync(): Promise<SourceId> {
    return await this.getAttributeValueAsync("name");
  }

  protected async getSourceValueAsync(event: Event): Promise<any> {
    let retVal = await this.getAttributeValueAsync("bc-value");
    if (!retVal) {
      retVal = await this.getAttributeValueAsync("value");
    }
    return retVal;
  }
}
