import ISourceOptions from "./context/ISourceOptions";
import ISource from "./data/ISource";
import { EventHandler } from "./event/EventHandler";

export const AsyncFunction = eval(
  "Object.getPrototypeOf(async function () {}).constructor"
);

export declare type SourceId = string;

export declare type SourceHandler = EventHandler<ISource>;

export declare type HttpMethod = "POST" | "GET";

export declare type ConnectionOptions = {
  Url: string;
  Verb: HttpMethod;
  Heartbeat: string;
  HeartbeatVerb: HttpMethod;
};

export declare type ConnectionSetting = string | ConnectionOptions;

export interface IServerResponseSetting {
  keepalive?: boolean;
}

export interface IServerResponse<T> {
  setting?: IServerResponseSetting;
  sources: Array<IServerResponseSource<T>>;
}

export interface IServerResponseSource<T> {
  data?: Array<T>;
  options: IServerResponseSourceOptions;
}

export interface IServerResponseSourceOptions extends ISourceOptions {
  tableName: string;
  extra?: any;
}

export declare type SourceData = Array<any> | ISourceData;

export interface ISourceData {
  options: ISourceOptions;
  data: Array<any>;
}
