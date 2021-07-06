import { DependencyContainer } from "tsyringe";
import ComponentCollection from "../../../ComponentCollection";
import IContext from "../../../context/IContext";
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
  readonly reservedKeys: Array<string>;

  constructor(
    element: Element,
    context: IContext,
    container: DependencyContainer,
    reservedKeys?: Array<string>
  ) {
    super(element, context);
    this.container = container;
    this.collection = container.resolve(ComponentCollection);
    this.reservedKeys = reservedKeys;
  }

  async renderSourceAsync(source: ISource): Promise<void> {
    var result: string = null;
    if (source.rows) {
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

      var faces = await rawFaces.processAsync(
        source,
        this.context,
        this.reservedKeys
      );
      var replaces = await rawReplaces.ProcessAsync(this.context);
      var dividerRowCount = (await rawDividerRowCount?.getValueAsync()) ?? 0;
      var dividerTemplate = await rawDividerTemplate?.getValueAsync();
      var incompleteTemplate = await rawIncompleteTemplate?.getValueAsync();
      result = await this.renderDataPartAsync(
        source,
        faces,
        replaces,
        dividerRowCount,
        dividerTemplate,
        incompleteTemplate
      );
    }
    if (source.rows == null || (Util.HasValue(result) && result.length > 0)) {
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
    this.setContent(content);
    await this.collection.processNodesAsync(childNodes, false);
  }

  protected async renderDataPartAsync(
    dataSource: ISource,
    faces: FaceCollection,
    replaces: ReplaceCollection,
    dividerRowcount: number,
    dividerTemplate: string,
    incompleteTemplate: string
  ): Promise<string> {
    let result = new Array<string>();
    const param = new RenderParam(
      replaces,
      dataSource.rows.length,
      dividerRowcount,
      dividerTemplate,
      incompleteTemplate
    );
    for (const row of dataSource.rows) {
      result.push(await faces.renderAsync(param, row));
    }
    return result.join("");
  }
}
