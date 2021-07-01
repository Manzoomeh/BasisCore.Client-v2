import IContext from "../../context/IContext";
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
    await super.initializeAsync();
    const value = await this.getAttributeValueAsync("bc-triggers");
    if (value) {
      const triggers = value.split(" ");
      triggers?.forEach((type) =>
        this.node.addEventListener(type, this.onEventTriggerAsync.bind(this))
      );
    }
  }

  renderAsync(): Promise<boolean> {
    return Promise.resolve(true);
  }

  protected async onEventTriggerAsync(event: Event) {
    event.preventDefault();
    if (!this.busy) {
      this._busy = true;
      try {
        const id = await this.getSourceIdAsync();
        const value = await this.getSourceValueAsync(event);
        this.context.setAsSource(id ?? "cms.unknown", value);
      } finally {
        this._busy = false;
      }
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
