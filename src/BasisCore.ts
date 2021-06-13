import IBasisCore from "./IBasisCore";
import { DependencyContainer, inject, injectable } from "tsyringe";
import ComponentCollection from "./ComponentCollection";
import { SourceId } from "./type-alias";
import { AppendType } from "./enum";
import BasisCoreRootContext from "./context/BasisCoreRootContext";

@injectable()
export default class BasisCore implements IBasisCore {
  readonly context: BasisCoreRootContext;
  public readonly content: ComponentCollection;

  constructor(
    context: BasisCoreRootContext,
    @inject("container") container: DependencyContainer,
    @inject("root.nodes") nodes: Array<Node>
  ) {
    this.context = context;
    container.register("root.context", { useValue: context });
    container.register("context", { useToken: "root.context" });
    this.content = container.resolve(ComponentCollection);
    this.content.processNodesAsync(nodes);
  }

  public setSource(
    sourceId: SourceId,
    data: any,
    appendType: AppendType = AppendType.replace
  ) {
    this.context.setAsSource(sourceId, data, appendType);
  }
}
