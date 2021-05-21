import { FaceRowType } from "../enum";
import IContext from "../context/IContext";
import IData from "../data/IData";
import IToken from "../token/IToken";
import Util from "../Util";
import Face from "./Face";
import FaceCollection from "./FaceCollection";
import RawFace from "./RawFace";

export default class RawFaceCollection extends Array<RawFace> {
  static Create(element: Element): RawFaceCollection {
    var retVal = new RawFaceCollection();
    element
      .querySelectorAll("face")
      .forEach((x) => retVal.push(new RawFace(x)));
    return retVal;
  }

  async ProcessAsync(
    dataSource: IData,
    context: IContext
  ) /*: Promise<FaceCollection>*/ {
    var facesTask = this.map(async (x) => {
      var applyReplace = await Util.GetValueOrDefaultAsync(
        x.ApplyReplace,
        context,
        false
      );
      var applyFunction = await Util.GetValueOrDefaultAsync(
        x.ApplyFunction,
        context,
        false
      );
      var rowType = await this.GetRowTypeAsync(x.RowType, context);
      var levels =
        (await Util.GetValueOrDefaultAsync(x.Level, context))?.split("|") ??
        null;
      var filter = await Util.GetValueOrDefaultAsync(x.Filter, context);
      var relatedRows = Util.IsNullOrEmpty(filter)
        ? dataSource.Rows
        : await Util.ApplyFilterAsync(dataSource, filter);
      var template = await Util.GetValueOrDefaultAsync(x.Template, context, "");
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
    var value = await Util.GetValueOrDefaultAsync(token, context);
    if (value) {
      var list = Object.getOwnPropertyNames(FaceRowType).filter((x) =>
        Util.IsEqual(x, value)
      );
      retVal = list.length == 1 ? FaceRowType[list[0]] : FaceRowType.NotSet;
    }
    return retVal;
  }
}
