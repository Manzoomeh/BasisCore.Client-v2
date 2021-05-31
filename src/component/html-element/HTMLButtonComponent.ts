import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import HTMLElementComponent from "./HTMLElementComponent";

@injectable()
export default class HTMLButtonComponent extends HTMLElementComponent<HTMLButtonElement> {
  constructor(
    @inject("element") element: HTMLButtonElement,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }
}
