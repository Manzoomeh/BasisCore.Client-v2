import IContext from "../../context/IContext";
import IToken from "../IToken";

export default abstract class ValueToken<T> implements IToken<T> {
  readonly value: T;
  readonly context: IContext;
  constructor(value: T, context: IContext) {
    this.context = context;
    this.value = value;
  }
  getDefault(): T {
    return this.value;
  }
  getSourceNames(): string[] {
    return new Array<string>();
  }

  getValueAsync(wait: boolean = true): Promise<T> {
    return new Promise((resolve) => resolve(this.value));
  }
}
