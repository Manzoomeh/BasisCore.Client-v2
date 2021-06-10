import IContext from "../../../context/IContext";
import IData from "../../../data/IData";
import { FaceRowType } from "../../../enum";
import IToken from "../../../token/IToken";
import Util from "../../../Util";
import Face from "./Face";
import FaceCollection from "./FaceCollection";
import ITemplate from "./ITemplate";
import RawFace from "./RawFace";
import ContentTemplate from "./ContentTemplate";

export default class RawFaceCollection extends Array<RawFace> {
  static Create(element: Element, context: IContext): RawFaceCollection {
    var retVal = new RawFaceCollection();
    element
      .querySelectorAll("face")
      .forEach((x) => retVal.push(new RawFace(x, context)));
    return retVal;
  }

  public async processAsync(
    dataSource: IData,
    context: IContext,
    reservedKeys: Array<string>
  ): Promise<FaceCollection> {
    var facesTask = this.map(async (x) => {
      var applyReplace = (await x.ApplyReplace?.getValueAsync()) ?? faces;
      var applyFunction = (await x.ApplyFunction?.getValueAsync()) ?? false;
      var rowType = await this.GetRowTypeAsync(x.RowType);
      var levels = (await x.Level?.getValueAsync())?.split("|") ?? null;
      var filter = await x.Filter?.getValueAsync();
      var relatedRows = Util.IsNullOrEmpty(filter)
        ? dataSource.rows
        : await Util.ApplyFilterAsync(dataSource, filter, context);
      const templateParser: ITemplate = new ContentTemplate(
        x.Template,
        reservedKeys
      );
      return <Face>{
        ApplyFunction: applyFunction,
        ApplyReplace: applyReplace,
        RowType: rowType,
        Levels: levels,
        RelatedRows: relatedRows,
        template: templateParser,
      };
    });
    var faces = await Promise.all(facesTask);
    return new FaceCollection(...faces);
  }

  async GetRowTypeAsync(token: IToken<string>): Promise<FaceRowType> {
    var retVal = FaceRowType.NotSet;
    var value = await token?.getValueAsync();
    if (value) {
      var list = Object.getOwnPropertyNames(FaceRowType).filter((x) =>
        Util.isEqual(x, value)
      );
      retVal = list.length == 1 ? FaceRowType[list[0]] : FaceRowType.NotSet;
    }
    return retVal;
  }
}
