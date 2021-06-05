import { DependencyContainer } from "tsyringe";
import ComponentCollection from "../../../ComponentCollection";
import IContext from "../../../context/IContext";
import IData from "../../../data/IData";
import ISource from "../../../data/ISource";
import Util from "../../../Util";
import SourceBaseComponent from "../../SourceBaseComponent";
import FaceCollection from "./FaceCollection";
import RawFaceCollection from "./RawFaceCollection";
import RawReplaceCollection from "./RawReplaceCollection";
import RenderParam from "./RenderParam";
import ReplaceCollection from "./ReplaceCollection";

export default abstract class RenderableComponent extends SourceBaseComponent {
  readonly container: DependencyContainer;
  readonly collection: ComponentCollection;

  constructor(
    element: Element,
    context: IContext,
    container: DependencyContainer
  ) {
    super(element, context);
    this.container = container;
    this.collection = container.resolve(ComponentCollection);
  }

  async renderSourceAsync(source: ISource): Promise<void> {
    var result: string = null;
    if (source.data) {
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

      var faces = await rawFaces.processAsync(source.data, this.context);
      var replaces = await rawReplaces.ProcessAsync(this.context);
      var dividerRowCount = (await rawDividerRowCount?.getValueAsync()) ?? 0;
      var dividerTemplate = await rawDividerTemplate?.getValueAsync();
      var incompleteTemplate = await rawIncompleteTemplate?.getValueAsync();
      result = await this.renderDataPartAsync(
        source.data,
        faces,
        replaces,
        dividerRowCount,
        dividerTemplate,
        incompleteTemplate
      );
    }
    if (source.data == null || (Util.HasValue(result) && result.length > 0)) {
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
    const content = this.range.createContextualFragment(result);
    const childNodes = [...content.childNodes];
    this.setContent(content, source.appendType);
    await this.collection.processNodesAsync(childNodes);
  }

  protected renderDataPartAsync(
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
        dataSource.rows.length,
        dividerRowcount,
        dividerTemplate,
        incompleteTemplate
      );

      const result = dataSource.rows.reduce((r, row) => {
        param.data = row;
        r += faces.render(param);
        return r;
      }, "");
      resolve(result);
    });
  }
}
