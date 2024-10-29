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
import RawFaceCollection from "./RawFaceCollection";
import RenderParam from "./RenderParam";

declare const $bc: IBCUtil;

export default abstract class RenderableComponent<
  TRenderResult extends FaceRenderResult
> extends SourceBaseComponent {
  private _preCollection: ComponentCollection = null;
  readonly container: DependencyContainer;
  readonly reservedKeys: Array<string>;
  protected renderResultRepository: FaceRenderResultRepository<TRenderResult> =
    new FaceRenderResultRepository<TRenderResult>();
  protected processRenderedContent: boolean;

  constructor(
    element: Element,
    context: IContext,
    container: DependencyContainer,
    reservedKeys?: Array<string>
  ) {
    super(element, context);
    this.container = container;
    this.reservedKeys = reservedKeys;
  }

  public async processAsync(): Promise<void> {
    this.processRenderedContent = await this.getAttributeBooleanValueAsync(
      "processRenderedContent",
      true
    );
    await super.processAsync();
  }

  async renderSourceAsync(source: ISource): Promise<Node[]> {
    let renderResult: Array<TRenderResult>;
    if (source.rows) {
      const rawFaces = RawFaceCollection.Create(
        this.node,
        this.context,
        this.reservedKeys ? this.reservedKeys[0] : null
      );
      const faces = await rawFaces.processAsync(
        source,
        this.context,
        this.reservedKeys
      );
      renderResult = await this.renderDataPartAsync(source, faces);
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
          const content = range.extractContents();
          renderResult.forEach((element) => element.AppendTo(content));
          range.insertNode(content);
          range.detach();
        }
      } else {
        renderResult.forEach((element) => element.AppendTo(doc));
      }
    } else {
      const result = await this.node
        .querySelector("else-layout")
        ?.GetXMLTemplateToken(this.context)
        ?.getValueAsync();
      if (result) {
        this.appendTemplateToDoc(result, doc);
      }
    }
    return await this.setContentAsync(doc);
  }

  protected async renderDataPartAsync(
    dataSource: ISource,
    faces: FaceCollection
  ): Promise<TRenderResult[]> {
    const param = new RenderParam<TRenderResult>(
      dataSource,
      this.renderResultRepository,
      (key, ver, doc) => new FaceRenderResult(key, ver, doc)
    );
    let result: TRenderResult[];
    if (faces.hasRowTypeFilter) {
      result = [];
      for (const row of dataSource.rows) {
        const rowRenderResult = await faces.renderAsync<TRenderResult>(
          param,
          row
        );
        if (rowRenderResult) {
          result.push(rowRenderResult);
        }
      }
    } else {
      result = await Promise.all(
        dataSource.rows.map((row) =>
          faces.renderAsync<TRenderResult>(param, row)
        )
      );
    }
    return result;
  }

  protected appendTemplateToDoc(template: string, doc: DocumentFragment): void {
    const tmpResult = $bc.util.toElement(template);
    if (tmpResult.nodeName !== "parsererror") {
      Array.from(tmpResult.childNodes).forEach((node) => doc.appendChild(node));
    } else {
      doc.appendChild(tmpResult);
    }
  }

  protected async setContentAsync(
    doc: DocumentFragment
  ): Promise<Array<ChildNode>> {
    const generatedNodes = Array.from(doc.childNodes);
    this.setContent(doc, false);
    if (this.processRenderedContent) {
      if (this._preCollection) {
        await this._preCollection.disposeAsync();
      }
      this._preCollection = this.container.resolve(ComponentCollection);
      await this._preCollection.processNodesAsync(generatedNodes);
    }
    return generatedNodes;
  }
}
