import CommandComponent from "./component/CommandComponent";
import IComponent from "./component/IComponent";
import IDisposable from "./IDisposable";

export default interface IComponentCollection extends IDisposable {
  GetCommandListByCore(core: string): Array<CommandComponent>;
  GetCommandList(): Array<CommandComponent>;
  GetComponentList(): Array<IComponent>;
}
