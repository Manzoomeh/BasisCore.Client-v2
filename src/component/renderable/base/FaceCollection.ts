import { FaceRowType } from "../../../enum";
import Util from "../../../Util";
import IBCUtil from "../../../wrapper/IBCUtil";
import Face from "./Face";
import IRenderResult from "./IRenderResult";
import RenderParam from "./RenderParam";

declare const $bc: IBCUtil;

export default class FaceCollection extends Array<Face> {
  constructor(...faces: Face[]) {
    super(...faces);
    (<any>Object).setPrototypeOf(this, FaceCollection.prototype);
  }

  public async renderAsync(param: RenderParam, data: any[]): Promise<string> {
    var retVal: string = "";
    if (this.length == 0) {
      retVal = data[0].toString();
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
      if (firstMatchFace != null) {
        retVal = await firstMatchFace.template.getValueAsync(data);
        // if (firstMatchFace.ApplyReplace && param.replaces != null) {
        //   retVal = param.replaces.apply(retVal);
        // }
        // if (firstMatchFace.ApplyFunction) {
        //   //TODO:add function
        // }
        param.setRendered();
        // if (param.mustApplyDivider) {
        //   retVal += param.dividerTemplate;
        // }
        // if (param.isEnd) {
        //   var tmp = param.emptyCell;
        //   if (param.incompleteTemplate) {
        //     while (tmp > 1) {
        //       retVal += param.incompleteTemplate;
        //       tmp--;
        //     }
        //   }
        // }
      } else {
        param.setIgnored();
      }
    }
    return retVal;
  }

  public async renderAsync_(
    param: RenderParam,
    data: object
  ): Promise<IRenderResult> {
    let nodes: Node[] = null;
    const key = Reflect.get(data, param.keyFieldName);
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
      if (firstMatchFace != null) {
        nodes = await param.mustRenderAsync(data, key);
        if (!nodes) {
          const rawHtml = await firstMatchFace.template.getValueAsync(data);
          nodes = [...$bc.util.toNode(rawHtml).childNodes];
        }
        param.setRendered();
      } else {
        param.setIgnored();
      }
    }
    return { key, nodes };
  }
}
