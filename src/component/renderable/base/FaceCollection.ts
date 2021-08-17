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

  public async renderAsync<TRenderResult extends FaceRenderResult>(
    param: RenderParam<TRenderResult>,
    data: object
  ): Promise<TRenderResult> {
    let retVal: TRenderResult = null;
    if (this.length == 0) {
      param.setRendered();
    } else {
      var rowType = param.rowType;
      var firstMatchFace = this.filter((x) => {
        var con1 = x.RelatedRows.some((x) => Util.Equal(x, data));
        var con2 = x.RowType == FaceRowType.NotSet || x.RowType == rowType;
        var con3 =
          x.Levels == null ||
          x.Levels.some((y) => param.Levels.some((x) => x == y));
        return con1 && con2 && con3;
      })[0];
      if (firstMatchFace) {
        const [dataKey, version, preRenderResult] =
          await param.getRenderedResultAsync(data);
        if (preRenderResult) {
          retVal = preRenderResult;
        } else {
          const rawHtml = await firstMatchFace.template.getValueAsync(data);
          const renderResult = $bc.util.toHTMLElement(rawHtml);
          retVal = param.factory(dataKey, version, renderResult);
        }
        param.setRendered();
      } else {
        param.setIgnored();
      }
    }
    return retVal;
  }
}
