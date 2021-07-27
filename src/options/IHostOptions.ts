import IDictionary from "../IDictionary";
import { SourceData } from "../type-alias";

export default interface IHostOptions {
  debug: boolean;
  autoRender: boolean;
  serviceWorker: boolean;
  settings: IDictionary<any>;
  sources: IDictionary<SourceData>;
  dbLibPath: string;
  repositories: IDictionary<string>;
}
