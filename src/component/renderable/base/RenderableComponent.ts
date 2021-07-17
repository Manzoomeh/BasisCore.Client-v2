import { DependencyContainer } from "tsyringe";
import ComponentCollection from "../../../ComponentCollection";
import IContext from "../../../context/IContext";
import ISource from "../../../data/ISource";
import IToken from "../../../token/IToken";
import Util from "../../../Util";
import IBCUtil from "../../../wrapper/IBCUtil";
import SourceBaseComponent from "../../SourceBaseComponent";
import FaceCollection from "./FaceCollection";
import FaceRenderResult from "./FaceRenderResult";
import FaceRenderResultList from "./FaceRenderResultList";
import RawFaceCollection from "./RawFaceCollection";
import RenderParam from "./RenderParam";

declare const $bc: IBCUtil;
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
      const newRenderResultList = await this.renderDataPartAsync_(
        source,
        faces,
        this.CanRenderAsync.bind(this),
        keyField
      );
      this.renderResultList = newRenderResultList;
    }

    let container: DocumentFragment = null;
    if (this.renderResultList.size() > 0) {
      container = await this.createContentAsync();
    } else {
      var rawElseLayout = this.node
        .querySelector("else-layout")
        ?.GetTemplateToken(this.context);
      const result = await rawElseLayout?.getValueAsync();
      container = this.range.createContextualFragment(result ?? " ");
    }
    const generatedNodes = [...container.childNodes];
    this.setContent(container, false);
    return generatedNodes;
  }

  protected async createContentAsync(): Promise<DocumentFragment> {
    const rawLayout = this.node
      .querySelector("layout")
      ?.GetTemplateToken(this.context);
    let layoutTemplate = await rawLayout?.getValueAsync();
    const key = Date.now().toString(36);
    const elementHolder = `<basis-core-template-tag id="${key}"></basis-core-template-tag>`;
    layoutTemplate = layoutTemplate
      ? Util.ReplaceEx(layoutTemplate, "@child", elementHolder)
      : elementHolder;
    const layout = this.range.createContextualFragment(layoutTemplate);
    const childContainer = layout.querySelector(
      `basis-core-template-tag#${key}`
    );
    const tmp = this.range.createContextualFragment("");
    this.renderResultList.getGroup().forEach((result) => result.AppendTo(tmp));
    const range = new Range();
    range.selectNode(childContainer);
    range.deleteContents();
    range.insertNode(tmp);
    return layout;
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
  protected async renderDataPartAsync_(
    dataSource: ISource,
    faces: FaceCollection,
    canRenderAsync: (
      data: any,
      key: any,
      groupName?: string
    ) => Promise<TRenderResult>,
    keyField
  ): Promise<FaceRenderResultList<TRenderResult>> {
    const param = new RenderParam<TRenderResult>(canRenderAsync);
    const newRenderResultList = new FaceRenderResultList<TRenderResult>();
    for (const row of dataSource.rows) {
      const dataKey = this.getKeyValue(row, keyField);
      const renderResult = await faces.renderAsync_<TRenderResult>(
        param,
        row,
        dataKey,
        this.FaceRenderResultFactory
      );
      if (renderResult) {
        newRenderResultList.set(renderResult.key, renderResult);
      }
    }
    return newRenderResultList;
  }
}
