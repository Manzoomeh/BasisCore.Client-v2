import IDictionary from "../IDictionary";
import { SourceData } from "../type-alias";
import IPushOptions from "./IPushOptions";

export default interface IHostOptions {
  debug?: boolean;
  autoRender?: boolean;
  serviceWorker?: boolean | string;
  settings?: IDictionary<any>;
  sources?: IDictionary<SourceData>;
  dbLibPath?: string;
  repositories?: IDictionary<string>;
  push?: IPushOptions;
}
