import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import DataUtil from "../../data/DataUtil";
import ISource from "../../data/ISource";
import TokenUtil from "../../token/TokenUtil";
import FaceCollection from "./base/FaceCollection";
import FaceRenderResultRepository from "./base/FaceRenderResultRepository";
import RenderDataPartResult from "./base/IRenderDataPartResult";
import RenderableComponent from "./base/RenderableComponent";
import RenderParam from "./base/RenderParam";
import TreeFaceRenderResult from "./base/TreeFaceRenderResult";

@injectable()
export default class ViewComponent extends RenderableComponent<TreeFaceRenderResult> {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context, container, ["child"]);
  }

  protected async renderDataPartAsync(
    dataSource: ISource,
    faces: FaceCollection
  ): Promise<RenderDataPartResult<TreeFaceRenderResult>> {
    const newRenderResultList =
      new FaceRenderResultRepository<TreeFaceRenderResult>();
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
        dataSource,
        this.renderResultRepository,
        (key, ver, doc) => new TreeFaceRenderResult(key, ver, doc),
        "root"
      );
      rootRenderParam.setLevel(["1"]);
      var content = new Array<DocumentFragment>();

      for (const group of groupList) {
        const childItems = DataUtil.ApplySimpleFilter(
          dataSource.rows,
          groupColumn,
          group
        );
        const data = childItems[0];
        const level1Result = await faces.renderAsync<TreeFaceRenderResult>(
          rootRenderParam,
          data
        );
        if (level1Result) {
          newRenderResultList.set(level1Result.key, level1Result, "root");
          level1Result.setContent(null);

          const childRenderParam = new RenderParam<TreeFaceRenderResult>(
            dataSource,
            this.renderResultRepository,
            (key, ver, doc) => new TreeFaceRenderResult(key, ver, doc)
          );
          childRenderParam.setLevel(["2"]);
          var childRenderResult = this.range.createContextualFragment(" ");

          for (const row of childItems) {
            const renderResult = await faces.renderAsync<TreeFaceRenderResult>(
              childRenderParam,
              row
            );
            newRenderResultList.set(renderResult.key, renderResult);
            renderResult.AppendTo(childRenderResult);
          }
          level1Result.setContent(childRenderResult);
          const doc = this.range.createContextualFragment("");
          level1Result.AppendTo(doc);
          content.push(doc);
        }
      }
    }
    return new RenderDataPartResult<TreeFaceRenderResult>(
      content,
      newRenderResultList
    );
  }
}
