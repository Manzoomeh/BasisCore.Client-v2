import ILogger from "./ILogger";

export default class ConsoleLogger implements ILogger {
  LogError(message: string, exception: Error): void {
    console.error(message, exception);
  }
  LogInformation(message: string): void {
    console.info(message);
  }
  LogWarning(message: string): void {
    console.warn(message);
  }
}
