import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import DataUtil from "../../data/DataUtil";
import IData from "../../data/IData";
import FaceCollection from "./base/FaceCollection";
import RenderableComponent from "./base/RenderableComponent";
import RenderParam from "./base/RenderParam";
import ReplaceCollection from "./base/ReplaceCollection";

@injectable()
export default class TreeComponent extends RenderableComponent {
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
  }

  async RenderAsync(
    dataSource: IData,
    faces: FaceCollection,
    replaces: ReplaceCollection,
    dividerRowcount: number,
    dividerTemplate: string,
    incompleteTemplate: string
  ): Promise<string> {
    var retVal = "";
    if (dataSource.Rows.length != 0) {
      var foreignKey = await this.getAttributeValueAsync(
        "parentidcol",
        "parentid"
      );
      var principalKey = await this.getAttributeValueAsync("idcol", "id");
      var nullValue = await this.getAttributeValueAsync("nullvalue", "0");
      var rootRecords = DataUtil.ApplySimpleFilter(
        dataSource.Rows,
        foreignKey,
        nullValue
      );
      if (rootRecords.length == 0) {
        throw new Error(
          `Tree Command Has No Root Record In Data Member '${dataSource.Id}' With '${nullValue}' Value In '${foreignKey}' Column That Set In NullValue Attribute.`
        );
      }
      var rootRenderParam = new RenderParam(
        replaces,
        rootRecords.length,
        dividerRowcount,
        dividerTemplate,
        incompleteTemplate
      );
      rootRecords.forEach((row) => {
        rootRenderParam.Data = row;
        retVal += this.RenderLevel(
          dataSource,
          rootRenderParam,
          1,
          faces,
          replaces,
          dividerRowcount,
          dividerTemplate,
          incompleteTemplate,
          principalKey,
          foreignKey
        );
      });
    }
    return retVal;
  }

  RenderLevel(
    dataSource: IData,
    parentRenderParam: RenderParam,
    level: number,
    faces: FaceCollection,
    replaces: ReplaceCollection,
    dividerRowcount: number,
    dividerTemplate: string,
    incompleteTemplate: string,
    principalKey: string,
    foreignKey: string
  ): string {
    var retVal = "";
    var childRenderResult = "";
    var childRows = DataUtil.ApplySimpleFilter(
      dataSource.Rows,
      foreignKey,
      parentRenderParam.Data[principalKey]
    );

    var groups: { [key: string]: any } = {};
    if (childRows.length != 0) {
      var newLevel = level + 1;
      var childRenderParam = new RenderParam(
        replaces,
        childRows.length,
        dividerRowcount,
        dividerTemplate,
        incompleteTemplate
      );

      childRows.forEach((row) => {
        childRenderParam.Data = row;
        childRenderResult += this.RenderLevel(
          dataSource,
          childRenderParam,
          newLevel,
          faces,
          replaces,
          dividerRowcount,
          dividerTemplate,
          incompleteTemplate,
          principalKey,
          foreignKey
        );
      });
      groups[""] = childRenderResult;

      parentRenderParam.SetLevel([`${level}`]);
    } else {
      groups[""] = "";
      parentRenderParam.SetLevel([`${level}`, "end"]);
    }
    retVal = faces.Render(parentRenderParam, this.context);
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
