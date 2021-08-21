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
    const doc = new DocumentFragment();
    if (renderResult?.length > 0) {
      const rawLayout = this.node
        .querySelector("layout")
        ?.GetXMLTemplateToken(this.context);
      let layoutTemplate = await rawLayout?.getValueAsync();
      if (layoutTemplate) {
        const key = Date.now().toString(36);
        layoutTemplate = Util.ReplaceEx(
          layoutTemplate,
          "@child",
          `<basis-core-template-child-tag id="${key}"></basis-core-template-child-tag>`
        );
        this.appendTemplateToDoc(layoutTemplate, doc);
        const childContainer = doc.querySelector(
          `basis-core-template-child-tag#${key}`
        );
        if (!childContainer) {
          this.context.logger.logWarning(
            "@child place holder not found in layout template"
          );
        } else {
          const range = new Range();
          range.selectNode(childContainer);
          range.deleteContents();
          renderResult.forEach((element) => element.AppendTo(range));
        }
      } else {
        renderResult.forEach((element) => element.AppendTo(doc));
      }
    } else {
      var rawElseLayout = this.node
        .querySelector("else-layout")
        ?.GetXMLTemplateToken(this.context);
      const result = await rawElseLayout?.getValueAsync();
      if (result) {
        this.appendTemplateToDoc(result, doc);
      }
    }
    const generatedNodes = Array.from(doc.childNodes);
    this.setContent(doc, false);
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

  protected appendTemplateToDoc(template: string, doc: DocumentFragment): void {
    const tmpResult = $bc.util.toHTMLElement(template);
    if (tmpResult.nodeName !== "parsererror") {
      Array.from(tmpResult.childNodes).forEach((node) => doc.appendChild(node));
    } else {
      doc.appendChild(tmpResult);
    }
  }
}
