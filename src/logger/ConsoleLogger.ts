import { singleton } from "tsyringe";
import ISource from "../data/ISource";
import ILogger from "./ILogger";

@singleton()
export default class ConsoleLogger implements ILogger {
  public logSource(source: ISource): void {
    console.log(source);
    console.table(source?.rows);
  }

  public logError(message: string, exception: Error): void {
    console.error(message, exception);
  }

  public logInformation(message?: any, ...optionalParams: any[]): void {
    if (optionalParams && optionalParams.length > 0) {
      console.info(message, optionalParams);
    } else {
      console.info(message);
    }
  }

  public logWarning(message: string): void {
    console.warn(message);
  }
}
