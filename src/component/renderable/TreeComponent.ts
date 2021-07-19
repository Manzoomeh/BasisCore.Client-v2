import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import DataUtil from "../../data/DataUtil";
import ISource from "../../data/ISource";
import FaceCollection from "./base/FaceCollection";
import FaceRenderResultList from "./base/FaceRenderResultList";
import RenderDataPartResult from "./base/IRenderDataPartResult";
import RenderableComponent from "./base/RenderableComponent";
import RenderParam from "./base/RenderParam";
import { RenderResultSelector } from "./base/RenderResultSelector";
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

  protected async renderDataPartAsync(
    dataSource: ISource,
    faces: FaceCollection,
    canRenderAsync: RenderResultSelector<TreeFaceRenderResult>,
    keyField
  ): Promise<RenderDataPartResult<TreeFaceRenderResult>> {
    const tempGeneratedNodeList =
      new FaceRenderResultList<TreeFaceRenderResult>();
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
        canRenderAsync
      );
      var content = new Array<DocumentFragment>();
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
        const doc = this.range.createContextualFragment("");
        tmp.AppendTo(doc);
        content.push(doc);
      }
      return new RenderDataPartResult<TreeFaceRenderResult>(
        content,
        tempGeneratedNodeList
      );
    }
  }

  private async renderLevelAsync(
    dataSource: ISource,
    parentRenderParam: RenderParam<TreeFaceRenderResult>,
    level: number,
    faces: FaceCollection,
    principalKey: string,
    foreignKey: string,
    tempGeneratedNodeList: FaceRenderResultList<TreeFaceRenderResult>,
    canRenderAsync: RenderResultSelector<TreeFaceRenderResult>,
    keyField,
    data: object
  ): Promise<TreeFaceRenderResult> {
    var childRenderResult = this.range.createContextualFragment(" ");
    const childRows = DataUtil.ApplySimpleFilter(
      dataSource.rows,
      foreignKey,
      data[principalKey]
    );

    parentRenderParam.setLevel(
      childRows.length != 0 ? [`${level}`] : [`${level}`, "end"]
    );
    const parentKey = this.getKeyValue(data, keyField);
    const renderResult = await faces.renderAsync<TreeFaceRenderResult>(
      parentRenderParam,
      data,
      parentKey,
      this.FaceRenderResultFactory
    );
    if (renderResult) {
      tempGeneratedNodeList.set(renderResult.key, renderResult);
      renderResult.setContent(null);
      if (childRows.length != 0) {
        var newLevel = level + 1;
        const childRenderParam = new RenderParam<TreeFaceRenderResult>(
          canRenderAsync
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
      }
      renderResult.setContent(childRenderResult);
    }
    return renderResult;
  }
}
