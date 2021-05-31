import { singleton } from "tsyringe";
import { HostOptions } from "../options/HostOptions";
import ILogger from "./ILogger";

@singleton()
export default class ConsoleLogger implements ILogger {
  constructor(options: HostOptions) {
    console.log("logger", options);
  }
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
