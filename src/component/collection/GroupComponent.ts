import { injectable, inject, DependencyContainer } from "tsyringe";
import IContext from "../../context/IContext";
import ILocalContext from "../../context/ILocalContext";
import NonSourceBaseComponent from "../NonSourceBaseComponent";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class GroupComponent extends NonSourceBaseComponent {
  private collection: ComponentCollection;
  private readonly initializeTask: Promise<void>;
  private readonly localContext: ILocalContext;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context);
    console.log("ctor");
    const content = document.createDocumentFragment();
    const childNodes = [...element.childNodes];
    childNodes.forEach((node) => content.appendChild(node));
    const range = document.createRange();
    range.selectNode(element);
    range.deleteContents();
    range.insertNode(content);
    const childContainer = container.createChildContainer();
    childContainer.register("OwnerContext", { useValue: this.context });
    childContainer.register("nodes", { useValue: childNodes });
    childContainer.register("container", { useValue: childContainer });
    this.localContext = childContainer.resolve<ILocalContext>("ILocalContext");
    childContainer.register("context", { useValue: this.localContext });
    this.collection = childContainer.resolve(ComponentCollection);
    this.initializeTask = this.collection.initializeAsync();
  }

  public runAsync(): Promise<void> {
    console.log("GroupComponent.runAsync");
    return this.collection.runAsync();
  }
  public initializeAsync(): Promise<void> {
    return this.initializeTask;
  }
}
