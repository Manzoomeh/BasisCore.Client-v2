import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import DataUtil from "../../data/DataUtil";
import ISource from "../../data/ISource";
import IBCUtil from "../../wrapper/IBCUtil";
import FaceCollection from "./base/FaceCollection";
import FaceRenderResultRepository from "./base/FaceRenderResultRepository";
import RenderDataPartResult from "./base/IRenderDataPartResult";
import RenderableComponent from "./base/RenderableComponent";
import RenderParam from "./base/RenderParam";
import TreeFaceRenderResult from "./base/TreeFaceRenderResult";

declare const $bc: IBCUtil;

@injectable()
export default class TreeComponent extends RenderableComponent<TreeFaceRenderResult> {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("dc") container: DependencyContainer
  ) {
    super(element, context, container, ["child"]);
  }

  protected FaceRenderResultFactory(
    key: any,
    version: number,
    doc: HTMLElement
  ): TreeFaceRenderResult {
    return new TreeFaceRenderResult(key, version, doc);
  }

  protected async renderDataPartAsync(
    dataSource: ISource,
    faces: FaceCollection
  ): Promise<RenderDataPartResult<TreeFaceRenderResult>> {
    const tempGeneratedNodeList =
      new FaceRenderResultRepository<TreeFaceRenderResult>();
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
        dataSource,
        this.renderResultRepository,
        (key, ver, doc) => new TreeFaceRenderResult(key, ver, doc)
      );
      var renderResultList = new Array<TreeFaceRenderResult>();
      for (const row of rootRecords) {
        const renderResult = await this.renderLevelAsync(
          dataSource,
          rootRenderParam,
          1,
          faces,
          principalKey,
          foreignKey,
          tempGeneratedNodeList,
          row
        );
        renderResultList.push(renderResult);
      }
      return new RenderDataPartResult<TreeFaceRenderResult>(
        renderResultList,
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
    tempGeneratedNodeList: FaceRenderResultRepository<TreeFaceRenderResult>,
    data: object
  ): Promise<TreeFaceRenderResult> {
    var childRenderResult = $bc.util.toNode(" ");
    const childRows = DataUtil.ApplySimpleFilter(
      dataSource.rows,
      foreignKey,
      data[principalKey]
    );

    parentRenderParam.setLevel(
      childRows.length != 0 ? [`${level}`] : [`${level}`, "end"]
    );
    const renderResult = await faces.renderAsync<TreeFaceRenderResult>(
      parentRenderParam,
      data
    );
    if (renderResult) {
      tempGeneratedNodeList.set(renderResult.key, renderResult);
      renderResult.setContent(null);
      if (childRows.length != 0) {
        var newLevel = level + 1;
        const childRenderParam = new RenderParam<TreeFaceRenderResult>(
          dataSource,
          this.renderResultRepository,
          (key, ver, doc) => new TreeFaceRenderResult(key, ver, doc)
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
