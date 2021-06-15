import ISource from "../data/ISource";

export default interface ILogger {
  logSource(source: ISource): void;
  logError(message: string, exception: Error): void;
  logInformation(message?: any, ...optionalParams: any[]): void;
  logWarning(message: string): void;
}
