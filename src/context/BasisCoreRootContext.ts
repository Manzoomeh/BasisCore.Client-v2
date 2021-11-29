import { DependencyContainer, inject, injectable } from "tsyringe";
import ILogger from "../logger/ILogger";
import { HostOptions } from "../options/HostOptions";
import IContextRepository from "../repository/IContextRepository";
import RootContext from "./RootContext";

@injectable()
export default class BasisCoreRootContext extends RootContext {
  constructor(
    @inject("IContextRepository") repository: IContextRepository,
    @inject("ILogger") logger: ILogger,
    @inject("dc") container: DependencyContainer,
    options: HostOptions
  ) {
    super(repository, options, logger);
    container.register("host_options", { useValue: options });
    const queryString = window.location.search.substring(1);
    this.addQueryString(queryString);
    this.addRequestRelatedSources();
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
      this.setAsSource("cms.query", data);
    }
  }

  private addRequestRelatedSources() {
    if (document.cookie) {
      const cookieValues = document.cookie.split(";").map((x) => x.split("="));
      const data = cookieValues.reduce((data, pair) => {
        data[pair[0]] = pair[1];
        return data;
      }, {});
      this.setAsSource("cms.cookie", data);
    }

    const request = {
      requestId: -1,
      hostip: window.location.hostname,
      hostport: window.location.port,
    };
    this.setAsSource("cms.request", request);

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
    this.setAsSource("cms.cms", cms);
  }
}
