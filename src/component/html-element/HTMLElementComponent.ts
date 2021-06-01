import IContext from "../../context/IContext";
import { SourceId } from "../../type-alias";
import { NonRangeableComponent } from "../NonRangeableComponent";

export default abstract class HTMLElementComponent<
  TElement extends HTMLElement
> extends NonRangeableComponent<TElement> {
  protected triggers: string;
  constructor(element: TElement, context: IContext) {
    super(element, context);
    const triggers = this.node.attributes["bc-triggers"]?.value.split(" ");
    triggers?.forEach((type) =>
      this.node.addEventListener(type, this.onEventTriggerAsync.bind(this))
    );
  }

  public async initializeAsync(): Promise<void> {
    return Promise.resolve();
  }

  renderAsync(fromTrigger: boolean): Promise<void> {
    return Promise.resolve();
  }

  protected async onEventTriggerAsync(event: Event) {
    event.preventDefault();
    const id = this.getSourceId();
    const value = this.getSourceValue(event);
    this.context.setAsSource(id ?? "cms.unknown", value);
  }

  protected getSourceId(): SourceId {
    return this.node.attributes["name"]?.value;
  }

  protected getSourceValue(event: Event): any {
    return (this.node.attributes["bc-value"] ?? this.node.attributes["value"])
      ?.value;
  }
}
