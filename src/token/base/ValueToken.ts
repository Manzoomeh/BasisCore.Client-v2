import IContext from "../../context/IContext";
import IToken from "../IToken";

export default abstract class ValueToken<TType> implements IToken<TType> {
  readonly value: TType;
  readonly context: IContext;

  constructor(value: TType, context: IContext) {
    this.context = context;
    this.value = value;
  }

  getDefault(): TType {
    return this.value;
  }

  getSourceNames(): string[] {
    return new Array<string>();
  }

  getValueAsync(wait: boolean = true): Promise<TType> {
    return new Promise((resolve) => resolve(this.value));
  }
}
