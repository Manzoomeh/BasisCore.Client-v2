export default class ClientException extends Error {
  constructor(message: string) {
    super(message);
  }
}
