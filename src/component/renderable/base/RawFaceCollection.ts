import IContext from "../../../context/IContext";
import IData from "../../../data/IData";
import { FaceRowType } from "../../../enum";
import IToken from "../../../token/IToken";
import TokenUtil from "../../../token/TokenUtil";
import Util from "../../../Util";
import Face from "./Face";
import FaceCollection from "./FaceCollection";
import RawFace from "./RawFace";

export default class RawFaceCollection extends Array<RawFace> {
  static Create(element: Element, context: IContext): RawFaceCollection {
    var retVal = new RawFaceCollection();
    element
      .querySelectorAll("face")
      .forEach((x) => retVal.push(new RawFace(x, context)));
    return retVal;
  }

  async ProcessAsync(
    dataSource: IData,
    context: IContext
  ) /*: Promise<FaceCollection>*/ {
    var facesTask = this.map(async (x) => {
      var applyReplace = await TokenUtil.GetValueOrDefaultAsync(
        x.ApplyReplace,
        context,
        false
      );
      var applyFunction = await TokenUtil.GetValueOrDefaultAsync(
        x.ApplyFunction,
        context,
        false
      );
      var rowType = await this.GetRowTypeAsync(x.RowType, context);
      var levels =
        (await TokenUtil.GetValueOrDefaultAsync(x.Level, context))?.split(
          "|"
        ) ?? null;
      var filter = await TokenUtil.GetValueOrDefaultAsync(x.Filter, context);
      var relatedRows = Util.IsNullOrEmpty(filter)
        ? dataSource.Rows
        : await Util.ApplyFilterAsync(dataSource, filter);
      var template = await TokenUtil.GetValueOrDefaultAsync(
        x.Template,
        context,
        ""
      );
      dataSource.Columns.forEach((col, index) => {
        if (col.length > 0) {
          template = Util.ReplaceEx(template, `@${col}`, `@col${index + 1}`);
        }
      });

      return <Face>{
        ApplyFunction: applyFunction,
        ApplyReplace: applyReplace,
        RowType: rowType,
        FormattedTemplate: template,
        Levels: levels,
        RelatedRows: relatedRows,
      };
    });
    var faces = await Promise.all(facesTask);
    return new FaceCollection(...faces);
  }

  async GetRowTypeAsync(
    token: IToken<string>,
    context: IContext
  ): Promise<FaceRowType> {
    var retVal = FaceRowType.NotSet;
    var value = await TokenUtil.GetValueOrDefaultAsync(token, context);
    if (value) {
      var list = Object.getOwnPropertyNames(FaceRowType).filter((x) =>
        Util.isEqual(x, value)
      );
      retVal = list.length == 1 ? FaceRowType[list[0]] : FaceRowType.NotSet;
    }
    return retVal;
  }
}
