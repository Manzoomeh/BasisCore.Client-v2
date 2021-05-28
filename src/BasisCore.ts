import ClientException from "./exception/ClientException";
import IBasisCore from "./IBasisCore";
import { DependencyContainer, inject, injectable } from "tsyringe";
import GlobalContext from "./context/GlobalContext";
import ComponentCollection from "./component/collection/ComponentCollection";
import { SourceId } from "./type-alias";

@injectable()
export default class BasisCore implements IBasisCore {
  readonly context: GlobalContext;
  readonly content: ComponentCollection;

  constructor(
    context: GlobalContext,
    @inject("container") container: DependencyContainer
  ) {
    this.context = context;
    container.register("root.context", { useValue: context });
    container.register("context", { useToken: "root.context" });
    container.register("nodes", { useToken: "root.nodes" });
    this.content = container.resolve(ComponentCollection);
  }

  addSource(sourceId: SourceId, data: any, replace: boolean = true) {
    this.context.addAsSource(sourceId, data, replace);
  }

  public async runAsync(): Promise<void> {
    await this.content.initializeAsync();
    return this.content.runAsync();
  }
  setArea(selector: string): void;
  setArea(element: Element): void;
  setArea(param: any): void {
    // var element: Array<Element>;
    // if (typeof param === "string") {
    //   element = Array.from(document.querySelectorAll(param));
    // } else if (param instanceof Element) {
    //   element = [param];
    // } else {
    //   throw new ClientException("Invalid Argument");
    // }
    // this.content = new ComponentCollection(element, this.context);
    // this.content.initializeAsync().then((_) => this.content.runAsync());
  }
}
