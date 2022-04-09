import IQuestionCellManager from "./IQuestionCellManager";

export default class QuestionCellManager implements IQuestionCellManager {
  private readonly _container: Element;
  private readonly _cellCount: number;
  private readonly _cells: Array<Element>;
  private _childCount: number = 0;

  constructor(container: Element, cellCount: number) {
    this._container = container;
    this._cellCount = cellCount;
    this._cells = new Array<Element>();
    for (let i = 0; i < this._cellCount; i++) {
      var cell = document.createElement("div");
      cell.setAttribute("data-bc-schema-column", "");
      this._container.appendChild(cell);
      this._cells.push(cell);
    }
  }

  public add(questionUI: HTMLDivElement): void {
    const index = this._childCount % this._cellCount;
    this._cells[index].appendChild(questionUI);
    this._childCount += 1;
  }
}
