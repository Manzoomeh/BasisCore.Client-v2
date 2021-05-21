import { inject, singleton } from "tsyringe";
import IDictionary from "../IDictionary";
import ILogger from "../logger/ILogger";
import IHostOptions from "./IHostOptions";

declare var host: IHostOptions;

@singleton()
export class HostOptions implements IHostOptions {
  Debug: boolean;
  AutoRender: boolean;
  ServiceWorker: boolean;
  Settings: IDictionary<any>;
  OnRendered: (element: Element) => void;
  OnRendering: (element: Element) => boolean;
  Sources: { [key: string]: any[][] };
  DbLibPath: string = "alasql.min.js";

  constructor(@inject("ILogger") logger: ILogger) {
    this.setDefaults();
    if (typeof host !== "undefined") {
      var settings = { ...this.Settings, ...host.Settings };
      Object.assign(this, host);
      Object.assign(this.Settings, settings);
    }
  }

  private setDefaults() {
    this.Debug = false;
    this.AutoRender = true;
    this.ServiceWorker = false;
    this.Settings = {
      "defaults.binding.regex": "\\[##([^#]*)##\\]",
    };
    this.DbLibPath = "alasql.min.js";
    this.Sources = {};
  }

  public GetDefault(key: string, defaultValue: string = null): string {
    let retVal = defaultValue;
    switch (key) {
      case "binding.regex":
        retVal = "\\[##([^#]*)##\\]";
        break;

      default:
        break;
    }
    return retVal;
  }
}
