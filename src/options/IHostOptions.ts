import IDictionary from "../IDictionary";
import IConnectionSetting from "./IConnectionSetting";

export default interface IHostOptions {
  Debug: boolean;
  AutoRender: boolean;
  ServiceWorker: boolean;
  Settings: IDictionary<string | any | IConnectionSetting>;
  OnRendered: { (element: Element): void };
  OnRendering: { (element: Element): boolean };
  Sources: { [key: string]: Array<any[]> };
  DbLibPath: string;

  getDefault(key: string, defaultValue?: string): string;
}
