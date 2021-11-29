import IBasisCore from "./IBasisCore";
import { DependencyContainer, inject, injectable } from "tsyringe";
import ComponentCollection from "./ComponentCollection";
import { SourceId } from "./type-alias";
import BasisCoreRootContext from "./context/BasisCoreRootContext";
import ISourceOptions from "./context/ISourceOptions";

@injectable()
export default class BasisCore implements IBasisCore {
  readonly context: BasisCoreRootContext;
  public readonly content: ComponentCollection;

  constructor(
    context: BasisCoreRootContext,
    @inject("dc") container: DependencyContainer,
    @inject("root.nodes") nodes: Array<Node>
  ) {
    this.context = context;
    container.register("root.context", { useValue: context });
    container.register("context", { useToken: "root.context" });
    this.content = container.resolve(ComponentCollection);
    this.content.processNodesAsync(nodes);
  }

  public setSource(sourceId: SourceId, data: any, options?: ISourceOptions) {
    this.content.initializeTask.then((_) => {
      this.context.setAsSource(sourceId, data, options);
    });
  }
}
