import IDictionary from "../IDictionary";
import IConnectionSetting from "./IConnectionSetting";

export default interface IHostOptions {
  debug: boolean;
  autoRender: boolean;
  serviceWorker: boolean;
  settings: IDictionary<string | any | IConnectionSetting>;
  sources: { [key: string]: Array<any[]> };
  dbLibPath: string;
}
