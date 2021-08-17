import IHostOptions from "../options/IHostOptions";
import { SourceId } from "../type-alias";
import UtilWrapper from "./UtilWrapper";
import BCWrapper from "./BCWrapper";
import IBCWrapperFactory from "./IBCWrapperFactory";
import IUtilWrapper from "./IUtilWrapper";
import ISourceOptions from "../context/ISourceOptions";
import IBCUtil from "./IBCUtil";
import IBCWrapper from "./IBCWrapper";

export default class BCWrapperFactory implements IBCWrapperFactory, IBCUtil {
  elementList: Element[];
  private _global: IBCWrapper;
  public readonly all: Array<IBCWrapper> = new Array<IBCWrapper>();
  public get global(): IBCWrapper {
    return this._global ?? (this._global = this.new());
  }

  public readonly util: IUtilWrapper = new UtilWrapper();

  public addFragment(selector: string): IBCWrapper;
  public addFragment(element: Element): IBCWrapper;
  public addFragment(param: any): IBCWrapper {
    return this.global.addFragment(param);
  }

  public setOptions(options: IHostOptions): IBCWrapper {
    return this.global.setOptions(options);
  }

  public run(): IBCWrapper {
    if (this.global.elementList.length == 0) {
      this.global.addFragment(document.documentElement);
    }
    return this.global.run();
  }

  public setSource(
    sourceId: SourceId,
    data: any,
    options?: ISourceOptions
  ): IBCWrapper {
    return this.run().setSource(sourceId, data, options);
  }

  public new(): IBCWrapper {
    var retVal = new BCWrapper();
    this.all.push(retVal);
    return retVal;
  }
}
