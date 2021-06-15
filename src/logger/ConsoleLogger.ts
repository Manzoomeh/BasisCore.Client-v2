import { singleton } from "tsyringe";
import ISource from "../data/ISource";
import ILogger from "./ILogger";

@singleton()
export default class ConsoleLogger implements ILogger {
  logSource(source: ISource): void {
    console.table(source.id, source.rows);
  }
  logError(message: string, exception: Error): void {
    console.error(message, exception);
  }
  logInformation(message?: any, ...optionalParams: any[]): void {
    if (optionalParams && optionalParams.length > 0) {
      console.info(message, optionalParams);
    } else {
      console.info(message);
    }
  }
  logWarning(message: string): void {
    console.warn(message);
  }
}
