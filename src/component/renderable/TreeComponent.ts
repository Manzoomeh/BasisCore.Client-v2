import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import DataUtil from "../../data/DataUtil";
import ISource from "../../data/ISource";
import FaceCollection from "./base/FaceCollection";
import RenderableComponent from "./base/RenderableComponent";
import RenderParam from "./base/RenderParam";
//import ReplaceCollection from "./base/ReplaceCollection";

@injectable()
export default class TreeComponent extends RenderableComponent {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context, container, ["child"]);
  }

  protected async renderDataPartAsync(
    dataSource: ISource,
    faces: FaceCollection,
    // replaces: ReplaceCollection,
    // dividerRowCount: number,
    // dividerTemplate: string,
    // incompleteTemplate: string,
    canRenderAsync: (data: any, key: any) => Promise<Node[]>,
    keyField
  ): Promise<string> {
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
          `Tree Command Has No Root Record In Data Member '${dataSource.id}' With '${nullValue}' Value In '${foreignKey}' Column That Set In NullValue Attribute.`
        );
      }
      var rootRenderParam = new RenderParam(
        // replaces,
        // rootRecords.length,
        // dividerRowCount,
        // dividerTemplate,
        // incompleteTemplate,
        canRenderAsync,
        keyField
      );
      for (const row of rootRecords) {
        retVal += await this.renderLevelAsync(
          dataSource,
          rootRenderParam,
          1,
          faces,
          // replaces,
          // dividerRowCount,
          // dividerTemplate,
          // incompleteTemplate,
          principalKey,
          foreignKey,
          canRenderAsync,
          keyField,
          row
        );
      }
    }
    return retVal;
  }

  private async renderLevelAsync(
    dataSource: ISource,
    parentRenderParam: RenderParam,
    level: number,
    faces: FaceCollection,
    // replaces: ReplaceCollection,
    // dividerRowCount: number,
    // dividerTemplate: string,
    // incompleteTemplate: string,
    principalKey: string,
    foreignKey: string,
    canRenderAsync: (data: any, key: any) => Promise<Node[]>,
    keyField,
    data: any[]
  ): Promise<string> {
    var childRenderResult = "";
    const childRows = DataUtil.ApplySimpleFilter(
      dataSource.rows,
      foreignKey,
      data[principalKey]
    );

    if (childRows.length != 0) {
      var newLevel = level + 1;
      const childRenderParam = new RenderParam(
        // replaces,
        // childRows.length,
        // dividerRowCount,
        // dividerTemplate,
        // incompleteTemplate,
        canRenderAsync,
        keyField
      );

      for (const row of childRows) {
        childRenderResult += await this.renderLevelAsync(
          dataSource,
          childRenderParam,
          newLevel,
          faces,
          // replaces,
          // dividerRowCount,
          // dividerTemplate,
          // incompleteTemplate,
          principalKey,
          foreignKey,
          canRenderAsync,
          keyField,
          row
        );
      }
      parentRenderParam.setLevel([`${level}`]);
    } else {
      parentRenderParam.setLevel([`${level}`, "end"]);
    }
    const retVal = await faces.renderAsync(parentRenderParam, data);
    return retVal?.replace(`@child`, childRenderResult);
  }
}
