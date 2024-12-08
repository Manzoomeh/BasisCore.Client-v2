import IQuestionContainerManager from "./IQuestionContainerManager";

export default class QuestionGridManager implements IQuestionContainerManager {
  private readonly _container: Element;
  private readonly _column: Element;
  private readonly _gridColumns: number;

  constructor(container: Element, sectionGridColumns?: number) {
    this._container = container;
    this._gridColumns = sectionGridColumns;

    this._column = document.createElement("div");
    this._column.setAttribute("data-bc-schema-grid-container", "");
    this._container.appendChild(this._column);
  }

  public add(questionUI: HTMLDivElement): void {
    const colSpan = questionUI.getAttribute("data-colSpan");
    if (this._gridColumns && this._gridColumns > 1) {
      questionUI.style.width = `calc((100% / ${this._gridColumns ?? 1}) * (${colSpan}))`;
    } else {
      questionUI.style.width = "100%";
    }
    this._column.appendChild(questionUI);
  }
}