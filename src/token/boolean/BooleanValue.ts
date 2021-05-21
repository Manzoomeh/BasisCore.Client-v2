import ValueToken from "../base/ValueToken";

export default class BooleanValue extends ValueToken<boolean> {
  constructor(data: boolean) {
    super(data);
  }
}
