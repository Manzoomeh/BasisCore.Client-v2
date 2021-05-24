import ILogger from "../logger/ILogger";
import IHostOptions from "../options/IHostOptions";
import IRepository from "../repository/IRepository";
import { SourceId } from "../type-alias";

export default interface IContext {
  repository: IRepository;
  logger: ILogger;
  options: IHostOptions;
  checkSourceHeartbeatAsync(sourceId: SourceId): Promise<boolean>;
  loadPageAsync(
    pageName: string,
    rawCommand: string,
    pageSize: string,
    callDepth: number
  ): Promise<string>;
}
