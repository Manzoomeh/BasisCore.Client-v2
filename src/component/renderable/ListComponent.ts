import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import Util from "../../Util";
import IBCUtil from "../../wrapper/IBCUtil";
import FaceRenderResult from "./base/FaceRenderResult";
import RenderableComponent from "./base/RenderableComponent";

declare const $bc: IBCUtil;

@injectable()
export default class ListComponent extends RenderableComponent<FaceRenderResult> {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("dc") container: DependencyContainer
  ) {
    super(element, context, container);
  }

  protected async createContentAsync(
    renderResults?: Array<FaceRenderResult>
  ): Promise<ChildNode[]> {
    let retVal: Promise<ChildNode[]> = null;
    const dividerTagElement = this.node.querySelector("divider");
    if (dividerTagElement && renderResults?.length > 0) {
      const dividerTemplate = await dividerTagElement
        ?.GetTemplateToken(this.context)
        ?.getValueAsync();

      const cellCount = await dividerTagElement
        ?.GetIntegerToken("rowcount", this.context)
        ?.getValueAsync();

      const incompleteTemplateStr = await this.node
        .querySelector("incomplete")
        ?.GetXMLTemplateToken(this.context)
        ?.getValueAsync();
      const incompleteTemplate = incompleteTemplateStr
        ? $bc.util.toElement(incompleteTemplateStr)
        : document.createElement("div");

      let contentTemplate = "";
      const key = Date.now().toString(36);
      let index = cellCount;
      renderResults.forEach((_) => {
        contentTemplate += `<basis-core-template-list-item-tag data-type="${key}"></basis-core-template-list-item-tag>`;
        index--;
        if (index == 0) {
          contentTemplate += dividerTemplate;
          index = cellCount;
        }
      });
      while (index > 0 && index < cellCount) {
        contentTemplate += `<basis-core-template-list-item-tag data-type="${key}"></basis-core-template-list-item-tag>`;
        const incompleteRenderResult = new FaceRenderResult(
          null,
          0,
          incompleteTemplate.cloneNode(true) as HTMLElement
        );
        renderResults.push(incompleteRenderResult);
        index--;
      }
      let doc: DocumentFragment;
      let layoutTemplate = await this.node
        .querySelector("layout")
        ?.GetXMLTemplateToken(this.context)
        ?.getValueAsync();

      if (layoutTemplate) {
        layoutTemplate = Util.ReplaceEx(
          layoutTemplate,
          "@child",
          contentTemplate
        );
        doc = new DocumentFragment();
        Array.from(
          $bc.util.toNode(layoutTemplate).firstChild.childNodes
        ).forEach((node) => doc.appendChild(node));
      } else {
        doc = $bc.util.toNode(contentTemplate);
      }
      const items = Array.from(
        doc.querySelectorAll(
          `basis-core-template-list-item-tag[data-type="${key}"]`
        )
      );
      index = 0;
      renderResults.forEach((result) => {
        const range = new Range();
        range.selectNode(items[index++]);
        range.deleteContents();
        result.AppendTo(range);
        range.detach();
      });
      retVal = this.setContentAsync(doc);
    } else {
      retVal = super.createContentAsync(renderResults);
    }
    return await retVal;
  }
}
