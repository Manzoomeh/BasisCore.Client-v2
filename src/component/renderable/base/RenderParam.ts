import { FaceRowType } from "../../../enum";
import FaceRenderResult from "./FaceRenderResult";
//import ReplaceCollection from "./ReplaceCollection";

export default class RenderParam<TRenderResult extends FaceRenderResult> {
  //readonly replaces: ReplaceCollection;
  Levels: string[];
  //private readonly _renderableCount: number = 0;
  _renderedCount: number;
  //private readonly _cellPerRow: number = 0;
  // readonly dividerTemplate: string;
  // readonly incompleteTemplate: string;
  readonly keyFieldName?: string;
  readonly mustRenderAsync: (data: any, key: any) => Promise<TRenderResult>;
  //private _renderedCell: number;
  // get isEnd(): boolean {
  //   return this._renderableCount == this._renderedCount;
  // }
  // get emptyCell(): number {
  //   return this._cellPerRow - this._renderedCell;
  // }
  get rowType(): FaceRowType {
    return this._renderedCount % 2 == 0 ? FaceRowType.Even : FaceRowType.Odd;
  }
  // get mustApplyDivider(): boolean {
  //   return (
  //     this.dividerTemplate != null && this._renderedCell == 0 && !this.isEnd
  //   );
  // }
  constructor(
    mustRenderAsync: (data: any, key: any) => Promise<TRenderResult>,
    keyFieldName?: string
  ) {
    this.mustRenderAsync = mustRenderAsync;
    this.keyFieldName = keyFieldName ?? "id";
    this._renderedCount = 0;
  }
  setLevel(levels: string[]) {
    this.Levels = levels;
  }
  setRendered(): void {
    this._renderedCount++;
  }
  setIgnored() {
    this._renderedCount--;
  }
}
