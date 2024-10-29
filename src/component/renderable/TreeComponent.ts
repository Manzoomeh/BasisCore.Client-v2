import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import DataUtil from "../../data/DataUtil";
import ISource from "../../data/ISource";
import IBCUtil from "../../wrapper/IBCUtil";
import FaceCollection from "./base/FaceCollection";
import FaceRenderResultRepository from "./base/FaceRenderResultRepository";
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
  ): Promise<TreeFaceRenderResult[]> {
    if (dataSource.rows.length != 0) {
      const foreignKey = await this.getAttributeValueAsync(
        "parentidcol",
        "parentid"
      );
      const principalKey = await this.getAttributeValueAsync("idcol", "id");
      const nullValue = await this.getAttributeValueAsync("nullvalue", "0");
      const rootRecords = DataUtil.ApplySimpleFilter(
        dataSource.rows,
        foreignKey,
        nullValue
      );
      if (rootRecords.length == 0) {
        throw new Error(
          `Tree command has no root record in data member '${dataSource.id}' with '${nullValue}' value in '${foreignKey}' column that set in NullValue attribute.`
        );
      }
      const rootRenderParam = new RenderParam<TreeFaceRenderResult>(
        dataSource,
        this.renderResultRepository,
        (key, ver, doc) => new TreeFaceRenderResult(key, ver, doc)
      );
      const renderResultList = new Array<TreeFaceRenderResult>();
      for (const row of rootRecords) {
        const renderResult = await this.renderLevelAsync(
          dataSource,
          rootRenderParam,
          1,
          faces,
          principalKey,
          foreignKey,
          this.renderResultRepository,
          row
        );
        renderResultList.push(renderResult);
      }
      return renderResultList;
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
