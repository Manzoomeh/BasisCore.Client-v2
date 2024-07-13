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
  url: string;
  verb: HttpMethod;
  heartbeat: string;
  heartbeatverb: HttpMethod;
};

export declare type ConnectionSetting = string | ConnectionOptions;
export declare type IChartSetting = {
  chartType: string;
  group: string;
  y: string;
  chartTitle: string;
  legend: boolean;
  hover: boolean;
  style: IChartStyle;
  axisLabel?: boolean
  x?: string;
  chartContent?: string
  grid?: boolean;
};
export declare interface IBarChartSetting extends IChartSetting {
  horizontal: boolean;
};
export declare interface IFunnelChartSetting extends IChartSetting {
  style: IFunnelChartStyle;
};
export declare interface IDonutChartSetting extends IChartSetting {
  style: IDonutChartStyle;
};
export declare interface ILineChartSetting extends IChartSetting {
  style: ILineChartStyle;
};
export declare type IChartStyle = {
  backgroundColor: string;
  textColor: string;
  width: number;
  height: number;
  marginY: number;
  opacity: number;
  color: string[]
  marginX: number;
};
export declare interface IDonutChartStyle extends IChartStyle {

  innerRadiusDistance?: number
  outerRadiusDistance?: number
  cornerRadius?: number
};
export declare interface IFunnelChartStyle extends IChartStyle {

  innerPadding?: number
};
export declare interface ILineChartStyle extends IChartStyle {

  curveTension?: number
  thickness?: number
};
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
