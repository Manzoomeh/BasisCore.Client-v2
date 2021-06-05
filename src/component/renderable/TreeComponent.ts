import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import DataUtil from "../../data/DataUtil";
import IData from "../../data/IData";
import FaceCollection from "./base/FaceCollection";
import RenderableComponent from "./base/RenderableComponent";
import RenderParam from "./base/RenderParam";
import ReplaceCollection from "./base/ReplaceCollection";

@injectable()
export default class TreeComponent extends RenderableComponent {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext
  ) {
    super(element, context);
  }

  protected async renderDataPartAsync(
    dataSource: IData,
    faces: FaceCollection,
    replaces: ReplaceCollection,
    dividerRowCount: number,
    dividerTemplate: string,
    incompleteTemplate: string
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
        replaces,
        rootRecords.length,
        dividerRowCount,
        dividerTemplate,
        incompleteTemplate
      );
      rootRecords.forEach((row) => {
        rootRenderParam.data = row;
        retVal += this.renderLevel(
          dataSource,
          rootRenderParam,
          1,
          faces,
          replaces,
          dividerRowCount,
          dividerTemplate,
          incompleteTemplate,
          principalKey,
          foreignKey
        );
      });
    }
    return retVal;
  }

  private renderLevel(
    dataSource: IData,
    parentRenderParam: RenderParam,
    level: number,
    faces: FaceCollection,
    replaces: ReplaceCollection,
    dividerRowCount: number,
    dividerTemplate: string,
    incompleteTemplate: string,
    principalKey: string,
    foreignKey: string
  ): string {
    var retVal = "";
    var childRenderResult = "";
    var childRows = DataUtil.ApplySimpleFilter(
      dataSource.rows,
      foreignKey,
      parentRenderParam.data[principalKey]
    );

    var groups: { [key: string]: any } = {};
    if (childRows.length != 0) {
      var newLevel = level + 1;
      var childRenderParam = new RenderParam(
        replaces,
        childRows.length,
        dividerRowCount,
        dividerTemplate,
        incompleteTemplate
      );

      childRows.forEach((row) => {
        childRenderParam.data = row;
        childRenderResult += this.renderLevel(
          dataSource,
          childRenderParam,
          newLevel,
          faces,
          replaces,
          dividerRowCount,
          dividerTemplate,
          incompleteTemplate,
          principalKey,
          foreignKey
        );
      });
      groups[""] = childRenderResult;

      parentRenderParam.setLevel([`${level}`]);
    } else {
      groups[""] = "";
      parentRenderParam.setLevel([`${level}`, "end"]);
    }
    retVal = faces.render(parentRenderParam);
    if (retVal) {
      Object.getOwnPropertyNames(groups).forEach(
        (key) =>
          (retVal = retVal.replace(
            `@child${key ? `(${key})` : ""}`,
            groups[key]
          ))
      );
    }

    return retVal;
  }
}
