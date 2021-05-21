import ObjectToken from "../base/ObjectToken";

export default class BooleanObject extends ObjectToken<boolean> {
  constructor(rawValue: string) {
    super(rawValue);
  }
  tryParse(value: string): boolean {
    return (value ?? "false").toLowerCase() == "true";
  }
}
