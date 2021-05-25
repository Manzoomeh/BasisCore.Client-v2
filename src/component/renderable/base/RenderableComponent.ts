import IContext from "../../../context/IContext";
import IData from "../../../data/IData";
import IDataSource from "../../../data/IDataSource";
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

  async renderSourceAsync(dataSource: IDataSource): Promise<DocumentFragment> {
    var result: string = null;
    if (dataSource.data) {
      var rawIncompleteTemplate = this.node
        .querySelector("incomplete")
        ?.GetTemplateToken(this.context);
      var divider = this.node.querySelector("divider");
      var rawDividerTemplate = divider?.GetTemplateToken(this.context);
      var rawDividerRowCount = divider?.GetIntegerToken(
        "rowcount",
        this.context
      );
      var rawReplaces = RawReplaceCollection.Create(this.node, this.context);
      var rawFaces = RawFaceCollection.Create(this.node, this.context);

      var faces = await rawFaces.ProcessAsync(dataSource.data);
      var replaces = await rawReplaces.ProcessAsync(this.context);
      var dividerRowCount = (await rawDividerRowCount?.getValueAsync()) ?? 0;
      var dividerTemplate = await rawDividerTemplate?.getValueAsync();
      var incompleteTemplate = await rawIncompleteTemplate?.getValueAsync();
      result = await this.renderDataPartAsync(
        dataSource.data,
        faces,
        replaces,
        dividerRowCount,
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
      var layout = (await rawLayout?.getValueAsync()) ?? "@child";
      result = Util.ReplaceEx(layout, "@child", result ?? "");
    } else {
      var rawElseLayout = this.node
        .querySelector("else-layout")
        ?.GetTemplateToken(this.context);
      result = (await rawElseLayout?.getValueAsync()) ?? "";
    }
    return this.range.createContextualFragment(result);
  }

  renderDataPartAsync(
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
}
