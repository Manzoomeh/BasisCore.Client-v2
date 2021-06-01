import { singleton } from "tsyringe";
import ISource from "../data/ISource";
import { HostOptions } from "../options/HostOptions";
import ILogger from "./ILogger";

@singleton()
export default class ConsoleLogger implements ILogger {
  constructor(options: HostOptions) {
    console.log("logger", options);
  }
  logSource(source: ISource): void {
    console.table(source.data.id, source.data.rows);
  }
  logError(message: string, exception: Error): void {
    console.error(message, exception);
  }
  logInformation(message: string): void {
    console.info(message);
  }
  logWarning(message: string): void {
    console.warn(message);
  }
}
