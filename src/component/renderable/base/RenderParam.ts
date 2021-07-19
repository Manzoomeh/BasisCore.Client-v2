import { FaceRowType } from "../../../enum";
import FaceRenderResult from "./FaceRenderResult";
import { RenderResultSelector } from "./RenderResultSelector";

export default class RenderParam<TRenderResult extends FaceRenderResult> {
  Levels: string[];
  _renderedCount: number;

  readonly mustRenderAsync: RenderResultSelector<TRenderResult>;
  get rowType(): FaceRowType {
    return this._renderedCount % 2 == 0 ? FaceRowType.Even : FaceRowType.Odd;
  }
  constructor(mustRenderAsync: RenderResultSelector<TRenderResult>) {
    this.mustRenderAsync = mustRenderAsync;
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
