import { injectable, inject, DependencyContainer } from "tsyringe";
import IContext from "../../context/IContext";
import LocalContext from "../../context/LocalContext";
import { NonSourceBaseComponent } from "../NonSourceBaseComponent";
import ComponentCollection from "./ComponentCollection";

@injectable()
export default class GroupComponent extends NonSourceBaseComponent {
  private collection: ComponentCollection;
  private readonly initializeTask: Promise<void>;

  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("container") container: DependencyContainer
  ) {
    super(element, context);
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
    const localContext = childContainer.resolve<LocalContext>(LocalContext);
    childContainer.register("context", { useValue: localContext });
    this.collection = childContainer.resolve(ComponentCollection);
    this.initializeTask = this.collection.initializeAsync();
  }

  public runAsync(): Promise<void> {
    return this.collection.runAsync();
  }
  public initializeAsync(): Promise<void> {
    return this.initializeTask;
  }
}
