import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import HTMLComponent from "./HTMLComponent";

@injectable()
export default class HTMLIUnknownComponent extends HTMLComponent<HTMLElement> {
  constructor(
    @inject("element") element: HTMLElement,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }
}
