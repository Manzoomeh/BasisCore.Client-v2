import { inject, injectable } from "tsyringe";
import ConfigNotFoundException from "../exception/ConfigNotFoundException";
import IDictionary from "../IDictionary";
import Util from "../Util";
import IContextHostOptions from "./IContextHostOptions";
import IHostOptions from "./IHostOptions";

declare const host: IHostOptions;

@injectable()
export class HostOptions implements IContextHostOptions {
  Debug: boolean;
  AutoRender: boolean;
  ServiceWorker: boolean;
  Settings: IDictionary<any>;
  Sources: { [key: string]: any[][] };
  DbLibPath: string;

  private static _defaultSettings: IHostOptions;

  public static get defaultSettings(): IHostOptions {
    if (!HostOptions._defaultSettings) {
      const defaults: IHostOptions = {
        Debug: false,
        AutoRender: true,
        ServiceWorker: false,
        DbLibPath: "alasql.min.js",
        Settings: {
          "default.binding.regex": /\[##([^#]*)##\]/,
          "default.call.verb": "post",
          "default.dmnid": "",
          "default.source.verb": "post",
        },
        Sources: {},
      };
      if (typeof host != "undefined") {
        var settings = {
          ...defaults.Settings,
          ...host.Settings,
        };
        Object.assign(defaults, host);
        Object.assign(defaults.Settings, settings);
      }
      HostOptions._defaultSettings = defaults;
    }
    return HostOptions._defaultSettings;
  }

  constructor(@inject("host") options: Partial<IHostOptions>) {
    Object.assign(this, HostOptions.defaultSettings);
    if (options && options != HostOptions.defaultSettings) {
      var settings = { ...this.Settings, ...options.Settings };
      Object.assign(this, options);
      Object.assign(this.Settings, settings);
    }
  }

  public getDefault<T>(key: string, defaultValue: T = null): T {
    return this.getSetting<T>(`default.${key}`, defaultValue);
  }

  public getSetting<T>(key: string, defaultValue: T): T {
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
