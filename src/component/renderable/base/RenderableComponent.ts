import { DependencyContainer } from "tsyringe";
import ComponentCollection from "../../../ComponentCollection";
import IContext from "../../../context/IContext";
import ISource from "../../../data/ISource";
import Util from "../../../Util";
import SourceBaseComponent from "../../SourceBaseComponent";
import FaceCollection from "./FaceCollection";
import FaceRenderResult from "./FaceRenderResult";
import FaceRenderResultRepository from "./FaceRenderResultRepository";
import RenderDataPartResult from "./IRenderDataPartResult";
import RawFaceCollection from "./RawFaceCollection";
import RenderParam from "./RenderParam";

export default abstract class RenderableComponent<
  TRenderResult extends FaceRenderResult
> extends SourceBaseComponent {
  readonly container: DependencyContainer;
  readonly collection: ComponentCollection;
  readonly reservedKeys: Array<string>;
  protected renderResultRepository: FaceRenderResultRepository<TRenderResult>;

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

  async renderSourceAsync(source: ISource): Promise<Node[]> {
    let renderResult: DocumentFragment[];
    if (source.rows) {
      var rawFaces = RawFaceCollection.Create(
        this.node,
        this.context,
        this.reservedKeys ? this.reservedKeys[0] : null
      );
      var faces = await rawFaces.processAsync(
        source,
        this.context,
        this.reservedKeys
      );
      const newRenderResultList = await this.renderDataPartAsync(source, faces);
      this.renderResultRepository = newRenderResultList.repository;
      renderResult = newRenderResultList.result;
    }
    return await this.createContentAsync(renderResult);
  }

  protected async createContentAsync(
    renderResult?: DocumentFragment[]
  ): Promise<ChildNode[]> {
    let container: DocumentFragment;
    if (renderResult?.length > 0) {
      const rawLayout = this.node
        .querySelector("layout")
        ?.GetTemplateToken(this.context);
      let layoutTemplate = await rawLayout?.getValueAsync();
      const key = Date.now().toString(36);
      const elementHolder = `<basis-core-template-tag id="${key}"></basis-core-template-tag>`;
      layoutTemplate = layoutTemplate
        ? Util.ReplaceEx(layoutTemplate, "@child", elementHolder)
        : elementHolder;
      container = this.range.createContextualFragment(layoutTemplate);
      const childContainer = container.querySelector(
        `basis-core-template-tag#${key}`
      );
      renderResult.forEach((doc) => childContainer.appendChild(doc));
    } else {
      var rawElseLayout = this.node
        .querySelector("else-layout")
        ?.GetTemplateToken(this.context);
      const result = await rawElseLayout?.getValueAsync();
      container = this.range.createContextualFragment(result ?? "");
    }
    const generatedNodes = [...container.childNodes];
    this.setContent(container, false);
    return generatedNodes;
  }

  protected async renderDataPartAsync(
    dataSource: ISource,
    faces: FaceCollection
  ): Promise<RenderDataPartResult<TRenderResult>> {
    const param = new RenderParam<TRenderResult>(
      dataSource,
      this.renderResultRepository,
      (key, ver, doc) => new FaceRenderResult(key, ver, doc)
    );
    const newRenderResultList = new FaceRenderResultRepository<TRenderResult>();
    const renderResult = new Array<DocumentFragment>();
    for (const row of dataSource.rows) {
      const rowRenderResult = await faces.renderAsync<TRenderResult>(
        param,
        row
      );
      if (rowRenderResult) {
        newRenderResultList.set(rowRenderResult.key, rowRenderResult);
        const doc = this.range.createContextualFragment("");
        rowRenderResult.AppendTo(doc);
        renderResult.push(doc);
      }
    }
    return new RenderDataPartResult<TRenderResult>(
      renderResult,
      newRenderResultList
    );
  }
}
