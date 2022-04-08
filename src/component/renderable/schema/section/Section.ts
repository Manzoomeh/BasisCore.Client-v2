import { ISection } from "../IQuestionSchema";
import "./assets/style";
import layout from "./assets/layout.html";
import Util from "../../../../Util";
import IQuestionContainer from "../IQuestionContainer";

export default class Section implements IQuestionContainer {
  public readonly element: Element;
  public readonly cell: number = 1;
  public currentRow: HTMLDivElement = null;
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
  add(questionUI: HTMLDivElement): void {
    if (this.cell == 1) {
      this.element.appendChild(questionUI);
    } else {
      if (!this.currentRow) {
        this.currentRow = document.createElement("div");
        this.currentRow.setAttribute("data-bc-sm-question-row", "");
        this.element.appendChild(this.currentRow);
      }
      questionUI.setAttribute("data-bc-sm-question-cell", "");
      this.currentRow.appendChild(questionUI);
      if (this.currentRow.childNodes.length == this.cell) {
        this.currentRow = null;
      }
    }
  }
}
