import IDataSource from "./data/IDataSource";
import { EventHandler } from "./event/EventHandler";

export declare type SourceId = string;
export declare type SourceHandler = EventHandler<IDataSource>;
