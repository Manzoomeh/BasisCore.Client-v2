import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import DataUtil from "../../data/DataUtil";
import ISource from "../../data/ISource";
import TokenUtil from "../../token/TokenUtil";
import Util from "../../Util";
import FaceCollection from "./base/FaceCollection";
import FaceRenderResult from "./base/FaceRenderResult";
import FaceRenderResultList from "./base/FaceRenderResultList";
import RenderableComponent from "./base/RenderableComponent";
import RenderParam from "./base/RenderParam";
import TreeFaceRenderResult from "./base/TreeFaceRenderResult";
//import ReplaceCollection from "./base/ReplaceCollection";

@injectable()
export default class ViewComponent extends RenderableComponent<TreeFaceRenderResult> {
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
    keyFieldName
  ): Promise<FaceRenderResultList<TreeFaceRenderResult>> {
    const newRenderResultList =
      new FaceRenderResultList<TreeFaceRenderResult>();
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
      const rootRenderParam = new RenderParam<TreeFaceRenderResult>(
        canRenderAsync
      );
      rootRenderParam.setLevel(["1"]);
      var content = this.range.createContextualFragment(" ");

      for (const group of groupList) {
        const childItems = DataUtil.ApplySimpleFilter(
          dataSource.rows,
          groupColumn,
          group
        );
        const data = childItems[0];
        const key = this.getKeyValue(data, keyFieldName);
        const level1Result = await faces.renderAsync_<TreeFaceRenderResult>(
          rootRenderParam,
          data,
          key,
          this.FaceRenderResultFactory,
          "group"
        );
        if (level1Result) {
          newRenderResultList.set(level1Result.key, level1Result, "group");
          level1Result.setContent(null);

          const childRenderParam = new RenderParam<TreeFaceRenderResult>(
            canRenderAsync
          );
          childRenderParam.setLevel(["2"]);
          var childRenderResult = this.range.createContextualFragment(" ");

          for (const row of childItems) {
            const dataKey = this.getKeyValue(row, keyFieldName);
            const renderResult = await faces.renderAsync_<TreeFaceRenderResult>(
              childRenderParam,
              row,
              dataKey,
              this.FaceRenderResultFactory
            );
            newRenderResultList.set(renderResult.key, renderResult);
            renderResult.AppendTo(childRenderResult);
          }
          level1Result.setContent(childRenderResult);
          level1Result.AppendTo(content);
        }
      }
    }
    this.renderResult = content;
    return newRenderResultList;
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
}
