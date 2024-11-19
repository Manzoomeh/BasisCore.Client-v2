import { ISection } from "../IQuestionSchema";
import "./assets/style";
import Util from "../../../../Util";
import IQuestionContainerManager from "../IQuestionContainerManager";
import QuestionCellManager from "../QuestionCellManager";
import { Skin } from "../IFormMakerOptions";
import QuestionGridManager from "../QuestionGridManager";

export default class Section {
  public readonly element: Element;
  public containerManager: IQuestionContainerManager;
  public currentRow: HTMLDivElement = null;
  constructor(sectionSchema: ISection, container: Element, layout: string, skin: Skin, cell: number) {
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
    if (skin == "template2") {
      this.containerManager = new QuestionGridManager(this.element, sectionSchema.gridColumns);
    } else {
      this.containerManager = new QuestionCellManager(this.element, cell);
    }
  }
}
