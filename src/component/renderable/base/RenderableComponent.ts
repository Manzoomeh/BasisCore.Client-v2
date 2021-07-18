import { DependencyContainer } from "tsyringe";
import ComponentCollection from "../../../ComponentCollection";
import IContext from "../../../context/IContext";
import ISource from "../../../data/ISource";
import IToken from "../../../token/IToken";
import Util from "../../../Util";
import SourceBaseComponent from "../../SourceBaseComponent";
import FaceCollection from "./FaceCollection";
import FaceRenderResult from "./FaceRenderResult";
import FaceRenderResultList from "./FaceRenderResultList";
import RenderDataPartResult from "./IRenderDataPartResult";
import RawFaceCollection from "./RawFaceCollection";
import RenderParam from "./RenderParam";
import { RenderResultSelector } from "./RenderResultSelector";

export default abstract class RenderableComponent<
  TRenderResult extends FaceRenderResult
> extends SourceBaseComponent {
  readonly container: DependencyContainer;
  readonly collection: ComponentCollection;
  readonly reservedKeys: Array<string>;
  protected renderResultList: FaceRenderResultList<TRenderResult>;
  readonly keyFieldToken: IToken<string>;

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
    this.keyFieldToken = this.getAttributeToken("keyField");
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
      const keyField = await this.keyFieldToken?.getValueAsync();
      const newRenderResultList = await this.renderDataPartAsync(
        source,
        faces,
        this.CanRenderAsync.bind(this),
        keyField
      );
      this.renderResultList = newRenderResultList.repository;
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
      const range = new Range();
      range.selectNode(childContainer);
      range.deleteContents();
      renderResult.forEach((doc) => range.insertNode(doc));
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

  protected async CanRenderAsync(
    data: any,
    key: any,
    groupName?: string
  ): Promise<any> {
    let node = this.renderResultList?.get(key, groupName);
    if (node) {
      try {
        if (data.status == 1) {
          node = null;
        }
      } catch {}
    }
    return node;
  }

  protected FaceRenderResultFactory(
    key: any,
    doc: DocumentFragment
  ): TRenderResult {
    return new FaceRenderResult(key, doc) as TRenderResult;
  }
  protected getKeyValue(data: any, keyFieldName: string): any {
    return keyFieldName ? Reflect.get(data, keyFieldName) : data;
  }

  protected async renderDataPartAsync(
    dataSource: ISource,
    faces: FaceCollection,
    canRenderAsync: RenderResultSelector<TRenderResult>,
    keyField
  ): Promise<RenderDataPartResult<TRenderResult>> {
    const param = new RenderParam<TRenderResult>(canRenderAsync);
    const newRenderResultList = new FaceRenderResultList<TRenderResult>();
    const renderResult = new Array<DocumentFragment>();
    for (const row of dataSource.rows) {
      const dataKey = this.getKeyValue(row, keyField);
      const rowRenderResult = await faces.renderAsync<TRenderResult>(
        param,
        row,
        dataKey,
        this.FaceRenderResultFactory
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
