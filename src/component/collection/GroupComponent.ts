import { injectable, inject, container } from "tsyringe";
import IContext from "../../context/IContext";
import ILocalContext from "../../context/ILocalContext";
import { NonSourceBaseComponent } from "../NonSourceBaseComponent";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class GroupComponent extends NonSourceBaseComponent {
  private collection: ComponentCollection;
  private readonly initializeTask: Promise<void>;

  constructor(element: Element, @inject("IContext") context: IContext) {
    super(element, context);
    const content = document.createDocumentFragment();
    const childList = [...element.childNodes];
    childList.forEach((node) => content.appendChild(node));
    const range = document.createRange();
    range.selectNode(element);
    range.deleteContents();
    range.insertNode(content);
    this.collection = new ComponentCollection(childList, this.context);
    this.initializeTask = this.collection.initializeAsync();
  }

  private static createLocalContext(context: IContext): ILocalContext {
    const childContainer = container.createChildContainer();
    childContainer.register("OwnerContext", { useValue: context });
    return childContainer.resolve("ILocalContext");
  }
  public runAsync(): Promise<void> {
    return this.collection.runAsync();
  }
  public initializeAsync(): Promise<void> {
    return this.initializeTask;
  }
}
