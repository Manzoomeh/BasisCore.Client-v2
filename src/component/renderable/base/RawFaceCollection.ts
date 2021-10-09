import IContext from "../../../context/IContext";
import { FaceRowType } from "../../../enum";
import IToken from "../../../token/IToken";
import Util from "../../../Util";
import Face from "./Face";
import FaceCollection from "./FaceCollection";
import ITemplate from "./template/ITemplate";
import RawFace from "./RawFace";
import ContentTemplate from "./template/ContentTemplate";
import ISource from "../../../data/ISource";
import IBCUtil from "../../../wrapper/IBCUtil";

declare const $bc: IBCUtil;

export default class RawFaceCollection extends Array<RawFace> {
  static Create(
    element: Element,
    context: IContext,
    placeHolder?: string
  ): RawFaceCollection {
    var retVal = new RawFaceCollection();
    element
      .querySelectorAll("face")
      .forEach((x) => retVal.push(new RawFace(x, context, placeHolder)));
    return retVal;
  }

  public async processAsync(
    source: ISource,
    context: IContext,
    reservedKeys: Array<string>
  ): Promise<FaceCollection> {
    var facesTask = this.map(async (x) => {
      var rowType = await this.GetRowTypeAsync(x.RowType);
      var levels = (await x.Level?.getValueAsync())?.split("|") ?? null;
      var filter = await x.Filter?.getValueAsync();
      var relatedRows = Util.IsNullOrEmpty(filter)
        ? source.rows
        : await $bc.util.source.filterAsync(source, filter, context);
      const templateParser: ITemplate<any> = new ContentTemplate(
        context,
        x.Template,
        reservedKeys
      );
      return <Face>{
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
