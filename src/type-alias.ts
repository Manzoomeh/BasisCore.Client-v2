import IDataSource from "./data/IDataSource";
import { EventHandler } from "./event/EventHandler";
import IDictionary from "./IDictionary";
import IConnectionSetting from "./options/IConnectionSetting";

export declare type SourceId = string;
export declare type SourceHandler = EventHandler<IDataSource>;
export declare type HostSetting = IDictionary<
  string | any | IConnectionSetting
>;
