import CommandComponent from "./component/CommandComponent";
import IComponent from "./component/IComponent";
import ISourceOptions from "./context/ISourceOptions";
import RootContext from "./context/RootContext";
import { SourceId } from "./type-alias";

export default interface IBasisCore {
  context: RootContext;
  setSource(sourceId: SourceId, data: any, options?: ISourceOptions);
  GetCommandListByCore(core: string): Array<CommandComponent>;
  GetCommandList(): Array<CommandComponent>;
  GetComponentList(): Array<IComponent>;
}
