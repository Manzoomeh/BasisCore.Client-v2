import IDataSource from "../data/IDataSource";
import DataUtil from "../data/DataUtil";
import ILogger from "../logger/ILogger";
import IHostOptions from "../options/IHostOptions";
import IContext from "./IContext";
import EventManager from "../event/EventManager";
import { SourceId } from "../type-alias";
import IContextRepository from "../repository/IContextRepository";
import DataSet from "../data/DataSet";
import IDictionary from "../IDictionary";
import Util from "../Util";
import ClientException from "../exception/ClientException";

declare var alasql: any;

export default abstract class Context implements IContext {
  readonly repository: IContextRepository;
  readonly logger: ILogger;
  readonly options: IHostOptions;
  readonly onDataSourceAdded: EventManager<IDataSource>;

  constructor(
    repository: IContextRepository,
    options: IHostOptions,
    logger: ILogger
  ) {
    this.repository = repository;
    this.logger = logger;
    this.options = options;
    this.onDataSourceAdded = new EventManager<IDataSource>();
  }

  public abstract loadDataAsync(
    sourceId: SourceId,
    connectionName: string,
    parameters: IDictionary<string>
  ): Promise<DataSet>;

  public abstract loadPageAsync(
    pageName: string,
    rawCommand: string,
    pageSize: string,
    callDepth: number
  ): Promise<string>;

  checkSourceHeartbeatAsync(source: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  public addAsSource(sourceId: SourceId, value: any, replace: boolean = true) {
    var source = DataUtil.ToDataSource(sourceId, value, replace);
    this.setSource(source);
  }
  public setSource(source: IDataSource): void {
    this.repository.setSource(source);
    this.onDataSourceAddedHandler(source);
  }

  protected onDataSourceAddedHandler(source: IDataSource) {
    console.log(`add ${source.data.Id} `);
    var handler = this.repository.Resolves.get(source.data.Id);
    if (handler) {
      handler.Trigger(source);
      this.repository.Resolves.delete(source.data.Id);
    }
    this.onDataSourceAdded.Trigger(source);
  }

  async getOrLoadDbLibAsync(): Promise<any> {
    var retVal;
    if (typeof alasql === "undefined") {
      if (Util.IsNullOrEmpty(this.options.DbLibPath)) {
        throw new ClientException(
          `Error in load 'alasql'. 'DbLibPath' Not Configure Properly In Host Object.`
        );
      }
      retVal = await this.getOrLoadObjectAsync(
        "alasql",
        this.options.DbLibPath
      );
    } else {
      retVal = alasql;
    }
    return retVal;
  }

  public getOrLoadObjectAsync(object: string, url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (eval(`typeof(${object})`) === "undefined") {
        var script = document.createElement("script");
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
}
