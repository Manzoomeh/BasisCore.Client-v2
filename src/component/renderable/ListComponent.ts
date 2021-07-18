import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import Util from "../../Util";
import FaceRenderResult from "./base/FaceRenderResult";
import RenderableComponent from "./base/RenderableComponent";

@injectable()
export default class ListComponent extends RenderableComponent<FaceRenderResult> {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context, container);
  }

  protected async createContentAsync(
    renderResult?: DocumentFragment[]
  ): Promise<ChildNode[]> {
    let retVal: ChildNode[] = null;
    const dividerTagElement = this.node.querySelector("divider");
    if (dividerTagElement && renderResult?.length > 0) {
      const dividerTemplate = await dividerTagElement
        ?.GetTemplateToken(this.context)
        ?.getValueAsync();

      const cellCount = await dividerTagElement
        ?.GetIntegerToken("rowcount", this.context)
        ?.getValueAsync();

      const incompleteTemplate = await this.node
        .querySelector("incomplete")
        ?.GetTemplateToken(this.context)
        ?.getValueAsync();

      let contentTemplate = "";
      const key = Date.now().toString(36);
      let index = cellCount;
      renderResult.forEach((_) => {
        contentTemplate += `<basis-core-template-tag id="${key}" data-type="result"></basis-core-template-tag>`;
        index--;
        if (index == 0) {
          contentTemplate += dividerTemplate;
          index = cellCount;
        }
      });
      while (index > 0 && index < cellCount) {
        contentTemplate += incompleteTemplate;
        index--;
      }
      let layoutTemplate = await this.node
        .querySelector("layout")
        ?.GetTemplateToken(this.context)
        ?.getValueAsync();
      layoutTemplate = layoutTemplate
        ? Util.ReplaceEx(layoutTemplate, "@child", contentTemplate)
        : contentTemplate;

      const content = this.range.createContextualFragment(layoutTemplate);
      const items = [
        ...content.querySelectorAll(
          `basis-core-template-tag#${key}[data-type="result"]`
        ),
      ];
      index = 0;
      renderResult.forEach((doc) => {
        const range = new Range();
        range.selectNode(items[index++]);
        range.deleteContents();
        range.insertNode(doc);
      });
      retVal = [...content.childNodes];
      this.setContent(content, false);
    } else {
      retVal = await super.createContentAsync(renderResult);
    }
    return retVal;
  }
}
