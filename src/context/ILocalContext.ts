import IContext from "./IContext";

export default interface ILocalContext extends IContext {
  dispose(): void;
}
