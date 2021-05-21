import SourceBaseCommand from "../command/SourceBaseCommand";
import IContext from "../context/IContext";
import IData from "../data/IData";
import IDataSource from "../data/IDataSource";
import Util from "../Util";
import FaceCollection from "./FaceCollection";
import RawFaceCollection from "./RawFaceCollection";
import RawReplaceCollection from "./RawReplaceCollection";
import RenderParam from "./RenderParam";
import ReplaceCollection from "./ReplaceCollection";

export default abstract class RenderableBase extends SourceBaseCommand {
  constructor(element: Element) {
    super(element);
  }

  async renderAsync(
    dataSource: IDataSource,
    context: IContext
  ): Promise<string> {
    var result: string = null;
    if (dataSource.data) {
      var rawIncompleteTemplate =
        this.Element.querySelector("incomplete")?.GetTemplateToken();
      var devider = this.Element.querySelector("divider");
      var rawDividerTemplate = devider?.GetTemplateToken();
      var rawDividerRowcount = devider?.GetIntegerToken("rowcount");
      var rawReplaces = RawReplaceCollection.Create(this.Element);
      var rawFaces = RawFaceCollection.Create(this.Element);

      var faces = await rawFaces.ProcessAsync(dataSource.data, context);
      var replaces = await rawReplaces.ProcessAsync(context);
      var dividerRowcount = await Util.GetValueOrDefaultAsync(
        rawDividerRowcount,
        context,
        0
      );
      var dividerTemplate = await Util.GetValueOrDefaultAsync<string>(
        rawDividerTemplate,
        context
      );
      var incompleteTemplate = await Util.GetValueOrDefaultAsync<string>(
        rawIncompleteTemplate,
        context
      );
      result = await this.RenderAsync(
        dataSource.data,
        context,
        faces,
        replaces,
        dividerRowcount,
        dividerTemplate,
        incompleteTemplate
      );
    }
    if (
      dataSource.data == null ||
      (Util.HasValue(result) && result.length > 0)
    ) {
      var rawLayout = this.Element.querySelector("layout")?.GetTemplateToken();
      var layout = await Util.GetValueOrDefaultAsync(
        rawLayout,
        context,
        "@child"
      );
      result = Util.ReplaceEx(layout, "@child", result ?? "");
    } else {
      var rawElseLayout =
        this.Element.querySelector("else-layout")?.GetTemplateToken();
      result = await Util.GetValueOrDefaultAsync(rawElseLayout, context, "");
    }
    //await this.applyResultAsync(result, context, replace);
    return result;
  }

  RenderAsync(
    dataSource: IData,
    context: IContext,
    faces: FaceCollection,
    replaces: ReplaceCollection,
    dividerRowcount: number,
    dividerTemplate: string,
    incompleteTemplate: string
  ): Promise<string> {
    return new Promise((resolve) => {
      var param = new RenderParam(
        replaces,
        dataSource.Rows.length,
        dividerRowcount,
        dividerTemplate,
        incompleteTemplate
      );
      var result: string = "";
      dataSource.Rows.forEach((row, _index, _) => {
        param.Data = row;
        result += faces.Render(param, context);
      });
      resolve(result);
    });
  }
}
