import ISourceOptions from "./context/ISourceOptions";
import ISource from "./data/ISource";
import { EventHandler } from "./event/EventHandler";
import IDictionary from "./IDictionary";

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

export declare type ServerResponseSetting = {
  keepalive: boolean;
};

export declare type ServerResponse = {
  setting: ServerResponseSetting;
  sources: IDictionary<ServerData<any>>;
};

export declare type ServerData<T> = {
  data: Array<T>;
  options: ISourceOptions;
};

export declare type SourceData = Array<any> | ISourceData;

export interface ISourceData {
  options: ISourceOptions;
  data: Array<any>;
}
