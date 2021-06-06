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

  protected getSourceValueAsync(event: Event): Promise<any> {
    const data = new FormData(this.node);

    const value = Array.from(data.keys()).reduce((result, key) => {
      console.log("form", key, data.get(key));
      result[key] = data.get(key);
      return result;
    }, {});
    return Promise.resolve(value);
  }
}
