import { inject, singleton } from "tsyringe";
import ConfigNotFoundException from "../exception/ConfigNotFoundException";
import IDictionary from "../IDictionary";
import ILogger from "../logger/ILogger";
import Util from "../Util";
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
    var defaultSettings = {
      Debug: true,
      AutoRender: true,
      ServiceWorker: false,
      DbLibPath: "alasql.min.js",
      Settings: {
        "default.binding.regex": "\\[##([^#]*)##\\]",
        "default.call.verb": "post",
        "default.dmnid": "",
      },
      OnRendered: null,
      OnRendering: null,
      Sources: {},
    };
    Object.assign(this, defaultSettings);
  }

  public getDefault(key: string, defaultValue: string = null): string {
    return this.getSetting(`default.${key}`, defaultValue);
  }

  public getSetting(key: string, defaultValue: string): any {
    var find = Object.getOwnPropertyNames(this.Settings).filter((x) =>
      Util.isEqual(x, key)
    );
    var retVal = find.length == 1 ? this.Settings[find[0]] : null;
    if (!retVal) {
      if (defaultValue !== undefined) {
        retVal = defaultValue;
      } else {
        throw new ConfigNotFoundException("host.settings", key);
      }
    }
    return retVal;
  }
}