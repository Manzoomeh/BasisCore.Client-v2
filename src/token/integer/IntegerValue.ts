import ValueToken from "../base/ValueToken";

export default class IntegerValue extends ValueToken<number> {
  constructor(data: number) {
    super(data);
  }
}
