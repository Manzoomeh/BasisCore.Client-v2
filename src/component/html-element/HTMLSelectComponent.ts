import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import HTMLElementComponent from "./HTMLElementComponent";

@injectable()
export default class HTMLSelectComponent extends HTMLElementComponent<HTMLSelectElement> {
  constructor(
    @inject("element") element: HTMLSelectElement,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }

  protected getSourceValue(event: Event): any {
    return this.node.value ?? super.getSourceValue(event);
  }
}
