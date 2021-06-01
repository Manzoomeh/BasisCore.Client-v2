import { DependencyContainer, inject, injectable } from "tsyringe";
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
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context, container);
  }

  protected async renderDataPartAsync(
    dataSource: IData,
    faces: FaceCollection,
    replaces: ReplaceCollection,
    dividerRowcount: number,
    dividerTemplate: string,
    incompleteTemplate: string
  ): Promise<string> {
    var retVal = "";
    if (dataSource.rows.length != 0) {
      var token = this.node.GetStringToken("groupcol", this.context);
      var groupColumn = await (
        await TokenUtil.GetValueOrSystemDefaultAsync(
          token,
          this.context,
          "ViewCommand.GroupColumn"
        )
      ).toLowerCase();
      var groupList = dataSource.rows
        .map((x) => x[groupColumn])
        .filter((x, i, arr) => arr.indexOf(x) === i);
      var rootRenderParam = new RenderParam(
        replaces,
        groupList.length,
        dividerRowcount,
        dividerTemplate,
        incompleteTemplate
      );
      rootRenderParam.setLevel(["1"]);

      groupList.forEach((group, _i, _) => {
        var childItems = DataUtil.ApplySimpleFilter(
          dataSource.rows,
          groupColumn,
          group
        );
        rootRenderParam.data = childItems[0];
        var level1Result: string = faces.render(rootRenderParam);
        var level2Result = "";
        var childRenderParam = new RenderParam(
          replaces,
          childItems.length,
          dividerRowcount,
          dividerTemplate,
          incompleteTemplate
        );
        childRenderParam.setLevel(["2"]);
        childItems.forEach((row, _i, _) => {
          childRenderParam.data = row;
          var renderResult = faces.render(childRenderParam);
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
