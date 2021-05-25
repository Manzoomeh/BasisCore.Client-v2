import { inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import DataUtil from "../../data/DataUtil";
import IData from "../../data/IData";
import TokenUtil from "../../token/TokenUtil";
import FaceCollection from "./base/FaceCollection";
import RenderableComponent from "./base/RenderableComponent";
import RenderParam from "./base/RenderParam";
import ReplaceCollection from "./base/ReplaceCollection";

@injectable()
export default class ViewComponent extends RenderableComponent {
  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
  }

  async renderDataPartAsync(
    dataSource: IData,
    faces: FaceCollection,
    replaces: ReplaceCollection,
    dividerRowcount: number,
    dividerTemplate: string,
    incompleteTemplate: string
  ): Promise<string> {
    var retVal = "";
    if (dataSource.Rows.length != 0) {
      var token = this.node.GetStringToken("groupcol", this.context);
      var groupColumn = await (
        await TokenUtil.GetValueOrSystemDefaultAsync(
          token,
          this.context,
          "ViewCommand.GroupColumn"
        )
      ).toLowerCase();
      var groupList = dataSource.Rows.map((x) => x[groupColumn]).filter(
        (x, i, arr) => arr.indexOf(x) === i
      );
      var rootRenderParam = new RenderParam(
        replaces,
        groupList.length,
        dividerRowcount,
        dividerTemplate,
        incompleteTemplate
      );
      rootRenderParam.SetLevel(["1"]);

      groupList.forEach((group, _i, _) => {
        var childItems = DataUtil.ApplySimpleFilter(
          dataSource.Rows,
          groupColumn,
          group
        );
        rootRenderParam.Data = childItems[0];
        var level1Result: string = faces.Render(rootRenderParam, this.context);
        var level2Result = "";
        var childRenderParam = new RenderParam(
          replaces,
          childItems.length,
          dividerRowcount,
          dividerTemplate,
          incompleteTemplate
        );
        childRenderParam.SetLevel(["2"]);
        childItems.forEach((row, _i, _) => {
          childRenderParam.Data = row;
          var renderResult = faces.Render(childRenderParam, this.context);
          if (renderResult) {
            level2Result += renderResult;
          }
        });
        retVal += level1Result.replace("@child", level2Result);
      });
    }
    return retVal;
  }
}
