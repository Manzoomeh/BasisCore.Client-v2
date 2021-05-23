import IContext from "../../../context/IContext";
import { FaceRowType } from "../../../enum";
import Util from "../../../Util";
import Face from "./Face";
import RenderParam from "./RenderParam";

export default class FaceCollection extends Array<Face> {
  constructor(...faces: Face[]) {
    super(...faces);
    (<any>Object).setPrototypeOf(this, FaceCollection.prototype);
  }
  Render(param: RenderParam, context: IContext): string {
    var retVal: string = "";
    if (this.length == 0) {
      retVal = param.Data[0].toString();
      param.SetRendered();
    } else {
      var rowType = param.RowType;
      var firstMatchFace = this.filter((x) => {
        var con1 = x.RelatedRows.some((x) => Util.Equal(x, param.Data));
        var con2 = x.RowType == FaceRowType.NotSet || x.RowType == rowType;
        var con3 =
          x.Levels == null ||
          x.Levels.some((y) => param.Levels.some((x) => x == y));
        return con1 && con2 && con3;
      })[0];
      if (firstMatchFace != null) {
        if (firstMatchFace.FormattedTemplate != null) {
          retVal = FaceCollection.Format(
            firstMatchFace.FormattedTemplate,
            param.Data
          );
          if (firstMatchFace.ApplyReplace && param.Replaces != null) {
            retVal = param.Replaces.Applay(retVal);
          }
          if (firstMatchFace.ApplyFunction) {
            //TODO:add function
          }
        }
        param.SetRendered();
        if (param.MustApplayDivider) {
          retVal += param.DividerTemplate;
        }
        if (param.IsEnd) {
          var tmp = param.EmptyCell;
          while (tmp > 0) {
            retVal += param.IncompleteTemplate;
            tmp--;
          }
        }
      } else {
        param.SetIgnored();
      }
    }
    return retVal;
  }
  static Format(format: string, object: any): string {
    var items = Object.getOwnPropertyNames(object)
      .map<{ value: any; pattern: string }>((x, i) => {
        return {
          value: Util.HasValue(object[x]) ? object[x] : "",
          pattern: `@col${i + 1}`,
        };
      })
      .reverse();
    items.forEach((x) => (format = Util.ReplaceEx(format, x.pattern, x.value)));
    return format;
  }
}
