import IContext from "../../../context/IContext";
import IData from "../../../data/IData";
import IDataSource from "../../../data/IDataSource";
import TokenUtil from "../../../token/TokenUtil";
import Util from "../../../Util";
import SourceBaseComponent from "../../SourceBaseComponent";
import FaceCollection from "./FaceCollection";
import RawFaceCollection from "./RawFaceCollection";
import RawReplaceCollection from "./RawReplaceCollection";
import RenderParam from "./RenderParam";
import ReplaceCollection from "./ReplaceCollection";

export default abstract class RenderableComponent extends SourceBaseComponent {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  async renderAsync(dataSource: IDataSource): Promise<string> {
    var result: string = null;
    if (dataSource.data) {
      var rawIncompleteTemplate = this.node
        .querySelector("incomplete")
        ?.GetTemplateToken(this.context);
      var devider = this.node.querySelector("divider");
      var rawDividerTemplate = devider?.GetTemplateToken(this.context);
      var rawDividerRowcount = devider?.GetIntegerToken(
        "rowcount",
        this.context
      );
      var rawReplaces = RawReplaceCollection.Create(this.node, this.context);
      var rawFaces = RawFaceCollection.Create(this.node, this.context);

      var faces = await rawFaces.ProcessAsync(dataSource.data, this.context);
      var replaces = await rawReplaces.ProcessAsync(this.context);
      var dividerRowcount = (await rawDividerRowcount?.getValueAsync()) ?? 0; // TokenUtil.GetValueOrDefaultAsync(        rawDividerRowcount,        0      );
      var dividerTemplate = await rawDividerTemplate?.getValueAsync(); //TokenUtil.GetValueOrDefaultAsync<string>(        rawDividerTemplate      );
      var incompleteTemplate = await rawIncompleteTemplate?.getValueAsync(); //TokenUtil.GetValueOrDefaultAsync<string>(        rawIncompleteTemplate      );
      result = await this.RenderAsync(
        dataSource.data,
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
      var rawLayout = this.node
        .querySelector("layout")
        ?.GetTemplateToken(this.context);
      var layout = (await rawLayout?.getValueAsync()) ?? "@child"; //TokenUtil.GetValueOrDefaultAsync(rawLayout, "@child");
      result = Util.ReplaceEx(layout, "@child", result ?? "");
    } else {
      var rawElseLayout = this.node
        .querySelector("else-layout")
        ?.GetTemplateToken(this.context);
      result = (await rawElseLayout?.getValueAsync()) ?? ""; //  await TokenUtil.GetValueOrDefaultAsync(rawElseLayout, "");
    }
    return result;
  }

  RenderAsync(
    dataSource: IData,
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
        result += faces.Render(param, this.context);
      });
      resolve(result);
    });
  }

  onDataSourceAdded(dataSource: IDataSource): void {
    this.canRenderCommandAsync(this.context).then((x) => {
      if (x) {
        this.getSourceNamesAsync().then((sources) => {
          if (sources.indexOf(dataSource.data.Name) != -1) {
            this.renderAsync(dataSource).then((renderResult) => {
              this.applyResult(renderResult, dataSource.replace);
            });
          }
        });
      }
    });
  }
}
