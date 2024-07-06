import { ISection } from "../IQuestionSchema";
import "./assets/style";
import layout from "./assets/layout.html";
import Util from "../../../../Util";
import IQuestionCellManager from "../IQuestionCellManager";
import QuestionCellManager from "../QuestionCellManager";

export default class Section {
  public readonly element: Element;
  public cellManager: IQuestionCellManager;
  public currentRow: HTMLDivElement = null;
  constructor(sectionSchema: ISection, container: Element, cell: number) {
    this.element = Util.parse(layout).querySelector("[data-bc-section]");
    const title = this.element.querySelector("[data-bc-section-title]");
    if (sectionSchema.title) {
      title.innerHTML =
        typeof sectionSchema.title === "string"
          ? sectionSchema.title
          : sectionSchema.title.value;
    } else {
      title.remove();
    }
    container.appendChild(this.element);
    this.cellManager = new QuestionCellManager(this.element, cell);
  }
}
