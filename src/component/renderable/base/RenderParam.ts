import { FaceRowType } from "../../../enum";
import ReplaceCollection from "./ReplaceCollection";

export default class RenderParam {
  Data: any[];
  readonly Replaces: ReplaceCollection;
  Levels: string[];
  readonly _RenderableCount: number = 0;
  _RenderedCount: number;
  readonly _CellPerRow: number = 0;
  readonly DividerTemplate: string;
  readonly IncompleteTemplate: string;
  _RenderedCell: number;
  get IsEnd(): boolean {
    return this._RenderableCount == this._RenderedCount;
  }
  get EmptyCell(): number {
    return this._CellPerRow - this._RenderedCell;
  }
  get RowType(): FaceRowType {
    return this._RenderedCount % 2 == 0 ? FaceRowType.Even : FaceRowType.Odd;
  }
  get MustApplayDivider(): boolean {
    return (
      this.DividerTemplate != null && this._RenderedCell == 0 && !this.IsEnd
    );
  }
  constructor(
    replaces: ReplaceCollection,
    renderableCount: number,
    recoredPerRow: number,
    dividerTemplate: string,
    incompleteTemplate: string
  ) {
    this.Replaces = replaces;
    this._CellPerRow = recoredPerRow;
    this._RenderableCount = renderableCount;
    this.DividerTemplate = dividerTemplate;
    this.IncompleteTemplate = incompleteTemplate;
    this._RenderedCount = 0;
  }
  SetLevel(levels: string[]) {
    this.Levels = levels;
  }
  SetRendered(): void {
    this._RenderedCount++;
    if (this._CellPerRow != 0) {
      this._RenderedCell = this._RenderedCount % this._CellPerRow;
    }
  }
  SetIgnored() {
    this._RenderedCount--;
  }
}
