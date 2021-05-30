import IDictionary from "../IDictionary";
import IConnectionSetting from "./IConnectionSetting";

export default interface IHostOptions {
  Debug: boolean;
  AutoRender: boolean;
  ServiceWorker: boolean;
  Settings: IDictionary<string | any | IConnectionSetting>;
  Sources: { [key: string]: Array<any[]> };
  DbLibPath: string;
}
