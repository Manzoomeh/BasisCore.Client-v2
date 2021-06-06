import ISource from "./data/ISource";
import { EventHandler } from "./event/EventHandler";
import IDictionary from "./IDictionary";
import IConnectionSetting from "./options/IConnectionSetting";

export declare type SourceId = string;
export declare type SourceHandler = EventHandler<ISource>;
export declare type HostSetting = IDictionary<
  string | any | IConnectionSetting
>;
export declare type HttpMethod = "POST" | "GET";
