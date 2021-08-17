import { DependencyContainer } from "tsyringe";
import ComponentCollection from "../../../ComponentCollection";
import IContext from "../../../context/IContext";
import ISource from "../../../data/ISource";
import Util from "../../../Util";
import IBCUtil from "../../../wrapper/IBCUtil";
import SourceBaseComponent from "../../SourceBaseComponent";
import FaceCollection from "./FaceCollection";
import FaceRenderResult from "./FaceRenderResult";
import FaceRenderResultRepository from "./FaceRenderResultRepository";
import RenderDataPartResult from "./IRenderDataPartResult";
import RawFaceCollection from "./RawFaceCollection";
import RenderParam from "./RenderParam";

declare const $bc: IBCUtil;

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
    let renderResult: Array<TRenderResult>;
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
    renderResult?: Array<TRenderResult>
  ): Promise<ChildNode[]> {
    let container: HTMLElement;
    if (renderResult?.length > 0) {
      const rawLayout = this.node
        .querySelector("layout")
        ?.GetTemplateToken(this.context);
      let layoutTemplate = await rawLayout?.getValueAsync();
      const range = new Range();
      if (layoutTemplate) {
        const key = Date.now().toString(36);
        const elementHolder = `<basis-core-template-tag id="${key}"></basis-core-template-tag>`;
        layoutTemplate = Util.ReplaceEx(
          layoutTemplate,
          "@child",
          elementHolder
        );
        container = $bc.util.toHTMLElement(layoutTemplate);
        const childContainer = container.querySelector(
          `basis-core-template-tag#${key}`
        );
        range.selectNode(childContainer);
        range.deleteContents();
      } else {
        container = document.createElement("div");
        range.setStart(container, 0);
        range.setEnd(container, 0);
      }
      renderResult.forEach((element) => element.AppendTo(range));
    } else {
      var rawElseLayout = this.node
        .querySelector("else-layout")
        ?.GetTemplateToken(this.context);
      const result = await rawElseLayout?.getValueAsync();
      if (result) {
        container = $bc.util.toHTMLElement(result);
      }
    }
    const generatedNodes = container ? [...container.childNodes] : [];
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
    const renderResult = new Array<TRenderResult>();
    for (const row of dataSource.rows) {
      const rowRenderResult = await faces.renderAsync<TRenderResult>(
        param,
        row
      );
      if (rowRenderResult) {
        newRenderResultList.set(rowRenderResult.key, rowRenderResult);
        renderResult.push(rowRenderResult);
      }
    }
    return new RenderDataPartResult<TRenderResult>(
      renderResult,
      newRenderResultList
    );
  }
}
