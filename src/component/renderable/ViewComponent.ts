import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import DataUtil from "../../data/DataUtil";
import ISource from "../../data/ISource";
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
    super(element, context, container, ["child"]);
  }

  protected async renderDataPartAsync(
    dataSource: ISource,
    faces: FaceCollection,
    replaces: ReplaceCollection,
    dividerRowcount: number,
    dividerTemplate: string,
    incompleteTemplate: string,
    canRenderAsync: (data: any, key: any) => Promise<Node[]>,
    keyField
  ): Promise<string> {
    var retVal = "";
    if (dataSource.rows.length != 0) {
      const token = this.getAttributeToken("groupcol");
      const groupColumn = (
        await TokenUtil.GetValueOrSystemDefaultAsync(
          token,
          this.context,
          "ViewCommand.GroupColumn"
        )
      ).toLowerCase();
      const groupList = dataSource.rows
        .map((x) => x[groupColumn])
        .filter((x, i, arr) => arr.indexOf(x) === i);
      const rootRenderParam = new RenderParam(
        replaces,
        groupList.length,
        dividerRowcount,
        dividerTemplate,
        incompleteTemplate,
        canRenderAsync,
        keyField
      );
      rootRenderParam.setLevel(["1"]);

      for (const group of groupList) {
        const childItems = DataUtil.ApplySimpleFilter(
          dataSource.rows,
          groupColumn,
          group
        );

        const level1Result = await faces.renderAsync(
          rootRenderParam,
          childItems[0]
        );
        let level2Result = "";
        const childRenderParam = new RenderParam(
          replaces,
          childItems.length,
          dividerRowcount,
          dividerTemplate,
          incompleteTemplate,
          canRenderAsync,
          keyField
        );
        childRenderParam.setLevel(["2"]);
        for (const row of childItems) {
          const renderResult = await faces.renderAsync(childRenderParam, row);
          if (renderResult) {
            level2Result += renderResult;
          }
        }
        retVal += level1Result.replace("@child", level2Result);
      }
    }
    return retVal;
  }
}
