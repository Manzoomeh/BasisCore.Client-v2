import ValueToken from "../base/ValueToken";

export default class StringValue extends ValueToken<string> {
  constructor(data: string) {
    super(data);
  }
}
