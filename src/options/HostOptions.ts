import { inject, injectable } from "tsyringe";
import ConfigNotFoundException from "../exception/ConfigNotFoundException";
import IDictionary from "../IDictionary";
import Util from "../Util";
import IContextHostOptions from "./IContextHostOptions";
import IHostOptions from "./IHostOptions";
import defaultsDeep from "lodash.defaultsdeep";
import cloneDeep from "lodash.clonedeep";

declare const host: IHostOptions;

@injectable()
export class HostOptions implements IContextHostOptions {
  debug: boolean;
  autoRender: boolean;
  serviceWorker: boolean;
  settings: IDictionary<any>;
  sources: { [key: string]: any[][] };
  dbLibPath: string;
  originalOptions: Partial<IHostOptions>;

  private static _defaultSettings: Partial<IHostOptions>;

  public static get defaultSettings(): Partial<IHostOptions> {
    if (!HostOptions._defaultSettings) {
      let defaults: Partial<IHostOptions> = {
        debug: false,
        autoRender: true,
        serviceWorker: false,
        dbLibPath: "alasql.min.js",
        settings: {
          "default.binding.regex": /\[##([^#]*)##\]/,
          "default.call.verb": "POST",
          "default.dmnid": "",
          "default.source.verb": "POST",
          "default.ViewCommand.GroupColumn": "prpid",
          "default.source.heartbeatVerb": "GET",
        },
      };
      if (typeof host != "undefined") {
        defaults = defaultsDeep(cloneDeep(host), defaults);
      }
      HostOptions._defaultSettings = defaults;
    }
    return HostOptions._defaultSettings;
  }

  constructor(@inject("IHostOptions") options: Partial<IHostOptions>) {
    const originalOptions = cloneDeep(options);
    if (options !== HostOptions.defaultSettings) {
      options = defaultsDeep(cloneDeep(options), HostOptions.defaultSettings);
      Object.assign(this, options);
    } else {
      Object.assign(this, cloneDeep(options));
    }
    this.originalOptions = originalOptions;
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
