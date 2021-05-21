import ClientException from "./ClientException";

export default class InvalidPropertyValueException extends ClientException {
  constructor(propertyName: string, propertyValue: string) {
    super(
      `InValid Data Format For '${propertyName}' Property '${propertyValue}'`
    );
  }
}
