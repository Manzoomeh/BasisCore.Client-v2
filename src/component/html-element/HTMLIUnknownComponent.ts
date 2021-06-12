import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import HTMLElementComponent from "./HTMLElementComponent";

@injectable()
export default class HTMLIUnknownComponent extends HTMLElementComponent<HTMLElement> {
  constructor(
    @inject("element") element: HTMLElement,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }
}
