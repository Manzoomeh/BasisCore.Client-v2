import { inject, injectable } from "tsyringe";
import DataSet from "../data/DataSet";
import { AppendType } from "../enum";
import ClientException from "../exception/ClientException";
import IDictionary from "../IDictionary";
import ILogger from "../logger/ILogger";
import ConnectionOptionsManager from "../options/connection-options/ConnectionOptionsManager";
import { HostOptions } from "../options/HostOptions";
import IContextRepository from "../repository/IContextRepository";
import { SourceId } from "../type-alias";
import Util from "../Util";
import Context from "./Context";

declare var alasql: any;

@injectable()
export default class GlobalContext extends Context {
  readonly connections: ConnectionOptionsManager;
  readonly loadLibDic: IDictionary<Promise<any>> = {};
  constructor(
    @inject("IContextRepository") repository: IContextRepository,
    @inject("ILogger") logger: ILogger,
    options: HostOptions
  ) {
    super(repository, options, logger);
    this.connections = new ConnectionOptionsManager(options.settings, this);
    this.addLocalSource();
    const queryString = window.location.search.substring(1);
    this.addQueryString(queryString);
  }

  public loadPageAsync(
    pageName: string,
    rawCommand: string,
    pageSize: string,
    callDepth: number
  ): Promise<string> {
    var parameters: any = {
      fileNames: pageName,
      dmnid: this.options.getDefault("dmnid"),
      siteSize: pageSize,
      command: rawCommand,
    };
    //TODO: add business for callDepth
    var connectionInfo = this.connections.GetConnection("callcommand");
    return connectionInfo.loadPageAsync(this, pageName, parameters);
  }

  public loadDataAsync(
    sourceId: SourceId,
    connectionName: string,
    parameters: IDictionary<string>
  ): Promise<DataSet> {
    let connectionInfo = this.connections.GetConnection(connectionName);
    return connectionInfo.loadDataAsync(this, sourceId, parameters);
  }

  async getOrLoadDbLibAsync(): Promise<any> {
    let retVal;
    if (typeof alasql === "undefined") {
      if (Util.IsNullOrEmpty(this.options.dbLibPath)) {
        throw new ClientException(
          `Error in load 'alasql'. 'DbLibPath' Not Configure Properly In Host Object.`
        );
      }
      retVal = await this.getOrLoadObjectAsync(
        "alasql",
        this.options.dbLibPath
      );
    } else {
      retVal = alasql;
    }
    return retVal;
  }

  public getOrLoadObjectAsync(object: string, url: string): Promise<any> {
    let retVal: Promise<any> = null;
    retVal = this.loadLibDic[object];
    if (!retVal) {
      retVal = this.loadLibDic[object] = new Promise((resolve, reject) => {
        if (eval(`typeof(${object})`) === "undefined") {
          const script = document.createElement("script");
          script.onload = (x) => resolve(eval(object));
          script.onerror = (x) => reject(x);
          script.setAttribute("type", "text/javascript");
          script.setAttribute("src", url);
          document.getElementsByTagName("head")[0].appendChild(script);
        } else {
          resolve(eval(object));
        }
      });
    }
    return retVal;
  }

  private addLocalSource() {
    if (document.cookie) {
      const cookieValues = document.cookie.split(";").map((x) => x.split("="));
      const data = cookieValues.reduce((data, pair) => {
        data[pair[0]] = pair[1];
        return data;
      }, {});
      this.setAsSource("cms.cookie", data, AppendType.replace);
    }

    const request = {
      requestId: -1,
      hostip: window.location.hostname,
      hostport: window.location.port,
    };
    this.setAsSource("cms.request", request, AppendType.replace);

    const toTwoDigit = (x) => ("0" + x).slice(-2);
    const d = new Date();
    const ye = d.getFullYear();
    const mo = toTwoDigit(d.getMonth());
    const da = toTwoDigit(d.getDay());
    const ho = toTwoDigit(d.getHours());
    const mi = toTwoDigit(d.getMinutes());
    const se = toTwoDigit(d.getSeconds());
    const cms = {
      date: `${ye}/${mo}/${da}`,
      time: `${ho}:${mi}`,
      date2: `${ye}${mo}${da}`,
      time2: `${ho}${mi}${se}`,
      date3: `${ye}.${mo}.${da}`,
    };
    this.setAsSource("cms.cms", cms, AppendType.replace);

    if (this.options.sources) {
      Object.getOwnPropertyNames(this.options.sources).forEach((key) => {
        this.setAsSource(
          key.toLowerCase(),
          this.options.sources[key],
          AppendType.replace
        );
      });
    }
  }
  public addQueryString(queryString: string) {
    if (queryString.length > 0) {
      const data = queryString
        .split("&")
        .map((x) => x.split("="))
        .reduce((data, pair) => {
          data[pair[0]] = decodeURIComponent(pair[1] ?? "");
          return data;
        }, {});

      this.setAsSource("cms.query", data, AppendType.replace);
    }
  }
}
