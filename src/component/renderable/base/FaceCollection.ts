import { FaceRowType } from "../../../enum";
import Util from "../../../Util";
import Face from "./Face";
import RenderParam from "./RenderParam";

export default class FaceCollection extends Array<Face> {
  constructor(...faces: Face[]) {
    super(...faces);
    (<any>Object).setPrototypeOf(this, FaceCollection.prototype);
  }
  public render(param: RenderParam): string {
    var retVal: string = "";
    if (this.length == 0) {
      retVal = param.data[0].toString();
      param.setRendered();
    } else {
      var rowType = param.rowType;
      var firstMatchFace = this.filter((x) => {
        var con1 = x.RelatedRows.some((x) => Util.Equal(x, param.data));
        var con2 = x.RowType == FaceRowType.NotSet || x.RowType == rowType;
        var con3 =
          x.Levels == null ||
          x.Levels.some((y) => param.Levels.some((x) => x == y));
        return con1 && con2 && con3;
      })[0];
      if (firstMatchFace != null) {
        //if (firstMatchFace.FormattedTemplate != null) {
        // retVal = FaceCollection.format(
        //   firstMatchFace.FormattedTemplate,
        //   param.data
        // );
        retVal = firstMatchFace.template.getValue(param.data);
        if (firstMatchFace.ApplyReplace && param.replaces != null) {
          retVal = param.replaces.apply(retVal);
        }
        if (firstMatchFace.ApplyFunction) {
          //TODO:add function
        }
        //}
        param.setRendered();
        if (param.mustApplyDivider) {
          retVal += param.dividerTemplate;
        }
        if (param.isEnd) {
          var tmp = param.emptyCell;
          if (param.incompleteTemplate) {
            while (tmp > 1) {
              retVal += param.incompleteTemplate;
              tmp--;
            }
          }
        }
      } else {
        param.setIgnored();
      }
    }
    return retVal;
  }
  private static format(format: string, object: any): string {
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
