import { CallbackArgument } from "./CallbackArgument";
import ISourceOptions from "./context/ISourceOptions";
import ISource from "./data/ISource";
import { MergeType } from "./enum";
import { EventHandler } from "./event/EventHandler";
import IDictionary from "./IDictionary";
import IConnectionSetting from "./options/IConnectionSetting";

export const AsyncFunction = eval(
  "Object.getPrototypeOf(async function () {}).constructor"
);

export declare type SourceId = string;
export declare type SourceHandler = EventHandler<ISource>;
export declare type HostSetting = IDictionary<
  string | any | IConnectionSetting
>;
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
