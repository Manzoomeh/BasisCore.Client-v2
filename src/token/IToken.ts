import IContext from "../context/IContext";

export default interface IToken<T> {
  getValueAsync(context: IContext, wait?: boolean): Promise<T>;
  getSourceNames(): Array<string>;
  getDefault(): T;
}
