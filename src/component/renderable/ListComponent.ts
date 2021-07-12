import { DependencyContainer, inject, injectable } from "tsyringe";
import IContext from "../../context/IContext";
import Util from "../../Util";
import RenderableComponent from "./base/RenderableComponent";

@injectable()
export default class ListComponent extends RenderableComponent {
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context, container);
  }

  protected async createContentAsync(): Promise<DocumentFragment> {
    let retVal: DocumentFragment = null;
    const dividerTagElement = this.node.querySelector("divider");
    if (dividerTagElement) {
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
      this.generatedNodeList.forEach((node) => {
        contentTemplate += `<basis-core-template-tag id="${key}"></basis-core-template-tag>`;
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
      const rawLayoutTemplate = this.node
        .querySelector("layout")
        ?.GetTemplateToken(this.context);
      let layoutTemplate = await rawLayoutTemplate?.getValueAsync();
      layoutTemplate = layoutTemplate
        ? Util.ReplaceEx(layoutTemplate, "@child", contentTemplate)
        : contentTemplate;

      retVal = this.range.createContextualFragment(layoutTemplate);
      const items = [
        ...retVal.querySelectorAll(`basis-core-template-tag#${key}`),
      ];

      index = 0;
      this.generatedNodeList.forEach((node) => {
        const range = new Range();
        console.log(items[index]);
        range.selectNode(items[index]);
        range.deleteContents();
        node.forEach((x) => range.insertNode(x));
        index++;
      });
    } else {
      retVal = await super.createContentAsync();
    }
    return retVal;
  }
}
