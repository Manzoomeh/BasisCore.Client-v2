import ObjectToken from "../base/ObjectToken";

export default class IntegerObject extends ObjectToken<number> {
  constructor(rawValue: string) {
    super(rawValue);
  }
  tryParse(value: string): number {
    try {
      return parseInt(value);
    } catch {
      /*Nothing*/
    }
    return 0;
  }
}
