import IDictionary from "../IDictionary";
import { SourceData } from "../type-alias";
import IConnectionSetting from "./IConnectionSetting";

export default interface IHostOptions {
  debug: boolean;
  autoRender: boolean;
  serviceWorker: boolean;
  settings: IDictionary<string | any | IConnectionSetting>;
  sources: IDictionary<SourceData>;
  dbLibPath: string;
  repositories: IDictionary<string>;
}
