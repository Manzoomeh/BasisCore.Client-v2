import ITokenElement from "./ITokenElement";

export class ValueTokenElement<T> implements ITokenElement {
  readonly value: T;
  constructor(value: T) {
    this.value = value;
  }
}
