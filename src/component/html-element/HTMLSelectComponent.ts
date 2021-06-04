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

  protected async getSourceValueAsync(event: Event): Promise<any> {
    return this.node.value ?? (await super.getSourceValueAsync(event));
  }
}
