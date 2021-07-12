import { DependencyContainer } from "tsyringe";
import ComponentCollection from "../../../ComponentCollection";
import IContext from "../../../context/IContext";
import ISource from "../../../data/ISource";
import IToken from "../../../token/IToken";
import Util from "../../../Util";
import IBCUtil from "../../../wrapper/IBCUtil";
import SourceBaseComponent from "../../SourceBaseComponent";
import FaceCollection from "./FaceCollection";
import RawFaceCollection from "./RawFaceCollection";
import RenderParam from "./RenderParam";

declare const $bc: IBCUtil;
export default abstract class RenderableComponent extends SourceBaseComponent {
  readonly container: DependencyContainer;
  readonly collection: ComponentCollection;
  readonly reservedKeys: Array<string>;
  protected generatedNodeList: Map<any, Node[]>;
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

  // async renderSourceAsync_(source: ISource): Promise<void> {
  //   var result: string = null;
  //   if (source.rows) {
  //     var rawIncompleteTemplate = this.node
  //       .querySelector("incomplete")
  //       ?.GetTemplateToken(this.context);
  //     var divider = this.node.querySelector("divider");
  //     var rawDividerTemplate = divider?.GetTemplateToken(this.context);
  //     var rawDividerRowCount = divider?.GetIntegerToken(
  //       "rowcount",
  //       this.context
  //     );
  //     //var rawReplaces = RawReplaceCollection.Create(this.node, this.context);
  //     var rawFaces = RawFaceCollection.Create(this.node, this.context);
  //     var faces = await rawFaces.processAsync(
  //       source,
  //       this.context,
  //       this.reservedKeys
  //     );
  //     //var replaces = await rawReplaces.ProcessAsync(this.context);
  //     var dividerRowCount = (await rawDividerRowCount?.getValueAsync()) ?? 0;
  //     var dividerTemplate = await rawDividerTemplate?.getValueAsync();
  //     var incompleteTemplate = await rawIncompleteTemplate?.getValueAsync();
  //     const keyField = await this.keyFieldToken?.getValueAsync();
  //     result = await this.renderDataPartAsync(
  //       source,
  //       faces,
  //       // replaces,
  //       // dividerRowCount,
  //       // dividerTemplate,
  //       // incompleteTemplate,
  //       this.CanRenderAsync.bind(this),
  //       keyField
  //     );
  //   }
  //   if (source.rows == null || (Util.HasValue(result) && result.length > 0)) {
  //     var rawLayout = this.node
  //       .querySelector("layout")
  //       ?.GetTemplateToken(this.context);
  //     var layout = (await rawLayout?.getValueAsync()) ?? "@child";
  //     result = Util.ReplaceEx(layout, "@child", result ?? "");
  //   } else {
  //     var rawElseLayout = this.node
  //       .querySelector("else-layout")
  //       ?.GetTemplateToken(this.context);
  //     result = (await rawElseLayout?.getValueAsync()) ?? "";
  //   }
  //   const content = this.range.createContextualFragment(result);
  //   const childNodes = [...content.childNodes];
  //   this.setContent(content, false);
  //   await this.collection.processNodesAsync(childNodes);
  // }

  // async renderSourceAsync_back(source: ISource): Promise<void> {
  //   if (source.rows) {
  //     var rawIncompleteTemplate = this.node
  //       .querySelector("incomplete")
  //       ?.GetTemplateToken(this.context);
  //     var divider = this.node.querySelector("divider");
  //     var rawDividerTemplate = divider?.GetTemplateToken(this.context);
  //     var rawDividerRowCount = divider?.GetIntegerToken(
  //       "rowcount",
  //       this.context
  //     );
  //     //var rawReplaces = RawReplaceCollection.Create(this.node, this.context);
  //     var rawFaces = RawFaceCollection.Create(this.node, this.context);
  //     var faces = await rawFaces.processAsync(
  //       source,
  //       this.context,
  //       this.reservedKeys
  //     );
  //     //var replaces = await rawReplaces.ProcessAsync(this.context);
  //     var dividerRowCount = (await rawDividerRowCount?.getValueAsync()) ?? 0;
  //     var dividerTemplate = await rawDividerTemplate?.getValueAsync();
  //     var incompleteTemplate = await rawIncompleteTemplate?.getValueAsync();
  //     const keyField = await this.keyFieldToken?.getValueAsync();
  //     await this.renderDataPartAsync_(
  //       source,
  //       faces,
  //       // replaces,
  //       // dividerRowCount,
  //       // dividerTemplate,
  //       // incompleteTemplate,
  //       this.CanRenderAsync.bind(this),
  //       keyField
  //     );
  //   }
  //   const container = this.range.createContextualFragment("");
  //   // this.generatedNodeList.forEach((node) =>
  //   //   node?.forEach((x) => container.appendChild(x))
  //   // );
  //   if (this.generatedNodeList.size > 0) {
  //     const rawLayout = this.node
  //       .querySelector("layout")
  //       ?.GetTemplateToken(this.context);
  //     const layout = (await rawLayout?.getValueAsync()) ?? "@child";
  //     this.createContent(
  //       layout,
  //       // dividerTemplate,
  //       // incompleteTemplate,
  //       // dividerRowCount,
  //       this.generatedNodeList
  //       //container
  //     );
  //   } else {
  //     var rawElseLayout = this.node
  //       .querySelector("else-layout")
  //       ?.GetTemplateToken(this.context);
  //     const result = await rawElseLayout?.getValueAsync();
  //     if (result) {
  //       const content = this.range.createContextualFragment(result);
  //       container.appendChild(content);
  //     }
  //   }
  //   //console.log(container);

  //   this.setContent(container, false);
  //   // if (this.Nodes) {
  //   //   var rawLayout = this.node
  //   //     .querySelector("layout")
  //   //     ?.GetTemplateToken(this.context);
  //   //   var layout = (await rawLayout?.getValueAsync()) ?? "@child";
  //   //   result = Util.ReplaceEx(layout, "@child", result ?? "");
  //   // } else {
  //   //   var rawElseLayout = this.node
  //   //     .querySelector("else-layout")
  //   //     ?.GetTemplateToken(this.context);
  //   //   result = (await rawElseLayout?.getValueAsync()) ?? "";
  //   // }
  //   // const content = this.range.createContextualFragment(result);
  //   // const childNodes = [...content.childNodes];
  //   // this.setContent(content, false);
  //   // await this.collection.processNodesAsync(childNodes);
  // }

  async renderSourceAsync(source: ISource): Promise<void> {
    if (source.rows) {
      var rawFaces = RawFaceCollection.Create(this.node, this.context);
      var faces = await rawFaces.processAsync(
        source,
        this.context,
        this.reservedKeys
      );
      const keyField = await this.keyFieldToken?.getValueAsync();
      await this.renderDataPartAsync_(
        source,
        faces,
        this.CanRenderAsync.bind(this),
        keyField
      );
    }
    let container: DocumentFragment = null;
    if (this.generatedNodeList.size > 0) {
      container = await this.createContentAsync();
    } else {
      var rawElseLayout = this.node
        .querySelector("else-layout")
        ?.GetTemplateToken(this.context);
      const result = await rawElseLayout?.getValueAsync();
      if (result) {
        container = this.range.createContextualFragment(result);
      }
    }
    //console.log(container);

    this.setContent(container, false);
    // if (this.Nodes) {
    //   var rawLayout = this.node
    //     .querySelector("layout")
    //     ?.GetTemplateToken(this.context);
    //   var layout = (await rawLayout?.getValueAsync()) ?? "@child";
    //   result = Util.ReplaceEx(layout, "@child", result ?? "");
    // } else {
    //   var rawElseLayout = this.node
    //     .querySelector("else-layout")
    //     ?.GetTemplateToken(this.context);
    //   result = (await rawElseLayout?.getValueAsync()) ?? "";
    // }
    // const content = this.range.createContextualFragment(result);
    // const childNodes = [...content.childNodes];
    // this.setContent(content, false);
    // await this.collection.processNodesAsync(childNodes);
  }

  // protected createContent_back(
  //   layout: string,
  //   divider: string,
  //   incomplete: string,
  //   cellCount: number,
  //   nodes: Map<any, Node[]>,
  //   container: DocumentFragment
  // ) {
  //   let tmp = "";
  //   const key = Date.now().toString(36);
  //   let index = cellCount;
  //   nodes.forEach((node) => {
  //     tmp += `<basis-core-template-tag id="${key}"></basis-core-template-tag>`;
  //     index--;
  //     if (index == 0) {
  //       tmp += divider;
  //       index = cellCount;
  //     }
  //   });
  //   while (index > 0) {
  //     tmp += incomplete;
  //     index--;
  //   }
  //   tmp = Util.ReplaceEx(layout ?? "@child", "@child", tmp ?? "");
  //   container.appendChild(this.range.createContextualFragment(tmp));
  //   const items = [
  //     ...container.querySelectorAll(`basis-core-template-tag#${key}`),
  //   ];

  //   index = 0;
  //   nodes.forEach((node) => {
  //     const range = new Range();
  //     console.log(items[index]);
  //     range.selectNode(items[index]);
  //     range.deleteContents();
  //     node.forEach((x) => range.insertNode(x));
  //     index++;
  //   });

  //   console.log(items);
  // }

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
    this.generatedNodeList.forEach((node) =>
      node.forEach((x) => tmp.appendChild(x))
    );
    const range = new Range();
    range.selectNode(childContainer);
    range.deleteContents();
    range.insertNode(tmp);
    return layout;
  }

  protected async CanRenderAsync(data: any, key: any): Promise<any> {
    let node = this.generatedNodeList?.get(key);
    if (node) {
    }
    return node;
  }

  protected async renderDataPartAsync(
    dataSource: ISource,
    faces: FaceCollection,
    // replaces: ReplaceCollection,
    // dividerRowcount: number,
    // dividerTemplate: string,
    // incompleteTemplate: string,
    canRenderAsync: (data: any, key: any) => Promise<Node[]>,
    keyField
  ): Promise<string> {
    let result = new Array<string>();
    const param = new RenderParam(
      // replaces,
      // dataSource.rows.length,
      // dividerRowcount,
      // dividerTemplate,
      // incompleteTemplate,
      canRenderAsync,
      keyField
    );
    const r = new Map<any, Node>();
    for (const row of dataSource.rows) {
      result.push(await faces.renderAsync(param, row));
    }
    return result.join("");
  }

  protected async renderDataPartAsync_(
    dataSource: ISource,
    faces: FaceCollection,
    canRenderAsync: (data: any, key: any) => Promise<Node[]>,
    keyField
  ): Promise<void> {
    const param = new RenderParam(canRenderAsync, keyField);
    const tempGeneratedNodeList = new Map<any, Node[]>();
    for (const row of dataSource.rows) {
      const renderResult = await faces.renderAsync_(param, row);
      if (renderResult.nodes) {
        tempGeneratedNodeList.set(renderResult.key, renderResult.nodes);
      }
    }
    this.generatedNodeList = tempGeneratedNodeList;
  }
}
