import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import DataUtil from "../../data/DataUtil";
import ISource from "../../data/ISource";
import Util from "../../Util";
import FaceCollection from "./base/FaceCollection";
import FaceRenderResultList from "./base/FaceRenderResultList";
import RenderableComponent from "./base/RenderableComponent";
import RenderParam from "./base/RenderParam";
import TreeFaceRenderResult from "./base/TreeFaceRenderResult";

@injectable()
export default class TreeComponent extends RenderableComponent<TreeFaceRenderResult> {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context, container, ["child"]);
  }

  protected FaceRenderResultFactory(
    key: any,
    doc: DocumentFragment
  ): TreeFaceRenderResult {
    return new TreeFaceRenderResult(key, doc);
  }

  protected async renderDataPartAsync_(
    dataSource: ISource,
    faces: FaceCollection,
    canRenderAsync: (data: any, key: any) => Promise<TreeFaceRenderResult>,
    keyField
  ): Promise<FaceRenderResultList<TreeFaceRenderResult>> {
    const tempGeneratedNodeList =
      new FaceRenderResultList<TreeFaceRenderResult>();
    var retVal = "";
    if (dataSource.rows.length != 0) {
      var foreignKey = await this.getAttributeValueAsync(
        "parentidcol",
        "parentid"
      );
      var principalKey = await this.getAttributeValueAsync("idcol", "id");
      var nullValue = await this.getAttributeValueAsync("nullvalue", "0");
      var rootRecords = DataUtil.ApplySimpleFilter(
        dataSource.rows,
        foreignKey,
        nullValue
      );
      if (rootRecords.length == 0) {
        throw new Error(
          `Tree command has no root record in data member '${dataSource.id}' with '${nullValue}' value in '${foreignKey}' column that set in NullValue attribute.`
        );
      }
      var rootRenderParam = new RenderParam<TreeFaceRenderResult>(
        canRenderAsync,
        keyField
      );
      var content = this.range.createContextualFragment("");
      for (const row of rootRecords) {
        const tmp = await this.renderLevelAsync(
          dataSource,
          rootRenderParam,
          1,
          faces,
          principalKey,
          foreignKey,
          tempGeneratedNodeList,
          canRenderAsync,
          keyField,
          row
        );
        tmp.AppendTo(content);
      }
      this.renderResult = content;
      return tempGeneratedNodeList;
    }
  }

  private renderResult: DocumentFragment;

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
    const range = new Range();
    range.selectNode(childContainer);
    range.deleteContents();
    range.insertNode(this.renderResult);
    return layout;
  }
  private async renderLevelAsync(
    dataSource: ISource,
    parentRenderParam: RenderParam<TreeFaceRenderResult>,
    level: number,
    faces: FaceCollection,
    principalKey: string,
    foreignKey: string,
    tempGeneratedNodeList: FaceRenderResultList<TreeFaceRenderResult>,
    canRenderAsync: (data: any, key: any) => Promise<TreeFaceRenderResult>,
    keyField,
    data: object
  ): Promise<TreeFaceRenderResult> {
    var childRenderResult = this.range.createContextualFragment(" ");
    const childRows = DataUtil.ApplySimpleFilter(
      dataSource.rows,
      foreignKey,
      data[principalKey]
    );

    if (childRows.length != 0) {
      var newLevel = level + 1;
      const childRenderParam = new RenderParam<TreeFaceRenderResult>(
        canRenderAsync,
        keyField
      );

      for (const row of childRows) {
        const childResult = await this.renderLevelAsync(
          dataSource,
          childRenderParam,
          newLevel,
          faces,
          principalKey,
          foreignKey,
          tempGeneratedNodeList,
          canRenderAsync,
          keyField,
          row
        );
        childResult.AppendTo(childRenderResult);
      }
      parentRenderParam.setLevel([`${level}`]);
    } else {
      parentRenderParam.setLevel([`${level}`, "end"]);
    }
    const renderResult = await faces.renderAsync_<TreeFaceRenderResult>(
      parentRenderParam,
      data,
      this.FaceRenderResultFactory
    );
    if (renderResult.nodes) {
      tempGeneratedNodeList.set(renderResult.key, renderResult);
      renderResult.setChild(childRenderResult);
    }
    return renderResult;
  }
}
