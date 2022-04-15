import IBasisCore from "./IBasisCore";
import { DependencyContainer, inject, injectable } from "tsyringe";
import ComponentCollection from "./ComponentCollection";
import { SourceId } from "./type-alias";
import BasisCoreRootContext from "./context/BasisCoreRootContext";
import ISourceOptions from "./context/ISourceOptions";
import CommandComponent from "./component/CommandComponent";
import IComponent from "./component/IComponent";

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

  GetCommandListByCore(core: string): CommandComponent[] {
    return this.content.GetCommandListByCore(core);
  }

  GetCommandList(): CommandComponent[] {
    return this.content.GetCommandList();
  }

  GetComponentList(): IComponent[] {
    return this.content.GetComponentList();
  }

  public setSource(sourceId: SourceId, data: any, options?: ISourceOptions) {
    this.content.initializeTask.then((_) => {
      this.context.setAsSource(sourceId, data, options);
    });
  }
}
