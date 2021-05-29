import { inject, injectable } from "tsyringe";
import ConfigNotFoundException from "../exception/ConfigNotFoundException";
import IDictionary from "../IDictionary";
import Util from "../Util";
import IContextHostOptions from "./IContextHostOptions";
import IHostOptions from "./IHostOptions";

@injectable()
export class HostOptions implements IContextHostOptions {
  Debug: boolean;
  AutoRender: boolean;
  ServiceWorker: boolean;
  Settings: IDictionary<any>;
  OnRendered: (element: Element) => void;
  OnRendering: (element: Element) => boolean;
  Sources: { [key: string]: any[][] };
  DbLibPath: string;

  public static readonly defaultSettings: IHostOptions = {
    Debug: true,
    AutoRender: true,
    ServiceWorker: false,
    DbLibPath: "alasql.min.js",
    Settings: {
      "default.binding.regex": /\[##([^#]*)##\]/,
      "default.call.verb": "post",
      "default.dmnid": "",
      "default.source.verb": "post",
    },
    OnRendered: null,
    OnRendering: null,
    Sources: {},
  };

  constructor(@inject("host") host: IHostOptions) {
    Object.assign(this, HostOptions.defaultSettings);
    if (host && host != HostOptions.defaultSettings) {
      var settings = { ...this.Settings, ...host.Settings };
      Object.assign(this, host);
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
