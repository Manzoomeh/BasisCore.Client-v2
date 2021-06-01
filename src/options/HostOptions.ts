import { inject, injectable } from "tsyringe";
import ConfigNotFoundException from "../exception/ConfigNotFoundException";
import IDictionary from "../IDictionary";
import Util from "../Util";
import IContextHostOptions from "./IContextHostOptions";
import IHostOptions from "./IHostOptions";

declare const host: IHostOptions;

@injectable()
export class HostOptions implements IContextHostOptions {
  debug: boolean;
  autoRender: boolean;
  serviceWorker: boolean;
  settings: IDictionary<any>;
  sources: { [key: string]: any[][] };
  dbLibPath: string;

  private static _defaultSettings: IHostOptions;

  public static get defaultSettings(): IHostOptions {
    if (!HostOptions._defaultSettings) {
      const defaults: IHostOptions = {
        debug: false,
        autoRender: true,
        serviceWorker: false,
        dbLibPath: "alasql.min.js",
        settings: {
          "default.binding.regex": /\[##([^#]*)##\]/,
          "default.call.verb": "post",
          "default.dmnid": "",
          "default.source.verb": "post",
          "default.ViewCommand.GroupColumn": "prpid",
        },
        sources: {},
      };
      if (typeof host != "undefined") {
        var settings = {
          ...defaults.settings,
          ...host.settings,
        };
        Object.assign(defaults, host);
        Object.assign(defaults.settings, settings);
      }
      HostOptions._defaultSettings = defaults;
    }
    return HostOptions._defaultSettings;
  }

  constructor(@inject("host") options: Partial<IHostOptions>) {
    Object.assign(this, HostOptions.defaultSettings);
    if (options && options != HostOptions.defaultSettings) {
      var settings = { ...this.settings, ...options.settings };
      Object.assign(this, options);
      Object.assign(this.settings, settings);
    }
  }

  public getDefault<T>(key: string, defaultValue: T = null): T {
    return this.getSetting<T>(`default.${key}`, defaultValue);
  }

  public getSetting<T>(key: string, defaultValue: T): T {
    var find = Object.getOwnPropertyNames(this.settings).filter((x) =>
      Util.isEqual(x, key)
    );
    var retVal = find.length == 1 ? this.settings[find[0]] : null;
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
