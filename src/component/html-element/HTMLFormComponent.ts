import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import HTMLElementComponent from "./HTMLElementComponent";

@injectable()
export default class HTMLFormComponent extends HTMLElementComponent<HTMLFormElement> {
  constructor(
    @inject("element") element: HTMLFormElement,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }

  protected getSourceValue(event: Event): any {
    const data = new FormData(this.node);
    const value = Array.from(data.keys()).reduce((result, key) => {
      result[key] = data.get(key);
      return result;
    }, {});
    return value;
  }
}
