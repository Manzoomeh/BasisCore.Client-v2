import IContext from "../context/IContext";

export default interface IToken<T> {
  context: IContext;
  getValueAsync(wait?: boolean): Promise<T>;
  getSourceNames(): Array<string>;
  getDefault(): T;
}
