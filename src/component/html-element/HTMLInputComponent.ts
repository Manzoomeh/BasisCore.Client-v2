import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import HTMLElementComponent from "./HTMLElementComponent";

@injectable()
export default class HTMLInputComponent extends HTMLElementComponent<HTMLInputElement> {
  constructor(
    @inject("element") element: HTMLInputElement,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }

  protected getSourceValue(event: Event): any {
    let value = super.getSourceValue(event);
    if (!value) {
      switch (this.node.type) {
        case "checkbox": {
          value = (this.node as any).checked;
          break;
        }
        default: {
          value = this.node.value;
          break;
        }
      }
    }
    return value;
  }
}
