import { FaceRowType } from "../../../enum";
import Util from "../../../Util";
import IBCUtil from "../../../wrapper/IBCUtil";
import Face from "./Face";
import FaceRenderResult from "./FaceRenderResult";
import RenderParam from "./RenderParam";

declare const $bc: IBCUtil;

export default class FaceCollection extends Array<Face> {
  constructor(...faces: Face[]) {
    super(...faces);
    (<any>Object).setPrototypeOf(this, FaceCollection.prototype);
  }

  public get hasRowTypeFilter(): boolean {
    return this.some((x) => x.RowType != FaceRowType.Odd);
  }

  public async renderAsync<TRenderResult extends FaceRenderResult>(
    param: RenderParam<TRenderResult>,
    data: object
  ): Promise<TRenderResult> {
    let retVal: TRenderResult = null;
    if (this.length == 0) {
      param.setRendered();
    } else {
      const firstMatchFace = this.find(
        (x) =>
          x.RelatedRows.some((x) => Util.Equal(x, data)) &&
          (x.RowType == FaceRowType.NotSet || x.RowType == param.rowType) &&
          (x.Levels == null ||
            x.Levels.some((y) => param.Levels.some((x) => x == y)))
      );
      if (firstMatchFace) {
        const [dataKey, version, preRenderResult] =
          await param.getRenderedResultAsync(data);
        if (preRenderResult) {
          retVal = preRenderResult;
        } else {
          const rawHtml = await firstMatchFace.template.getValueAsync(data);
          const renderResult = $bc.util.toElement(rawHtml);
          retVal = param.factory(dataKey, version, renderResult);
          param.setRenderedResult(retVal);
        }
        param.setRendered();
      } else {
        param.setIgnored();
      }
    }
    return retVal;
  }
}
