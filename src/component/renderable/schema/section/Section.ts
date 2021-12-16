import { ISection } from "../IQuestionSchema";
import "./assets/style";
import layout from "./assets/layout.html";
import Util from "../../../../Util";

export default class Section {
  public readonly element: Element;
  constructor(sectionSchema: ISection, container: Element) {
    this.element = Util.parse(layout).querySelector("[data-bc-section]");
    const title = this.element.querySelector("[data-bc-section-title]");
    if (sectionSchema.title) {
      title.innerHTML = sectionSchema.title;
    } else {
      title.remove();
    }
    container.appendChild(this.element);
  }
}
