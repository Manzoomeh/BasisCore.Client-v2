import IContext from "../../context/IContext";
import IToken from "../IToken";

export default abstract class ValueToken<T> implements IToken<T> {
  readonly value: T;
  constructor(value: T) {
    this.value = value;
  }
  getDefault(): T {
    return this.value;
  }
  getSourceNames(): string[] {
    return new Array<string>();
  }

  getValueAsync(context: IContext, wait: boolean = true): Promise<T> {
    return new Promise((resolve) => resolve(this.value));
  }
}
