import IBasisCore from "./IBasisCore";
import { DependencyContainer, inject, injectable } from "tsyringe";
import GlobalContext from "./context/GlobalContext";
import ComponentCollection from "./component/collection/ComponentCollection";
import { SourceId } from "./type-alias";

@injectable()
export default class BasisCore implements IBasisCore {
  readonly context: GlobalContext;
  readonly content: ComponentCollection;
  private runTask: Promise<void> = null;

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

  public setSource(sourceId: SourceId, data: any, replace: boolean = true) {
    this.context.setAsSource(sourceId, data, replace);
  }

  public run(): void {
    if (!this.runTask) {
      this.runTask = this.content
        .initializeAsync()
        .then((x) => this.content.processAsync());
    }
  }
}
