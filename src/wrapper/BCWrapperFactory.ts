import IHostOptions from "../options/IHostOptions";
import { SourceId } from "../type-alias";
import UtilWrapper from "./UtilWrapper";
import BCWrapper from "./BCWrapper";
import IBCWrapperFactory from "./IBCWrapperFactory";
import IUtilWrapper from "./IUtilWrapper";
import ISourceOptions from "../context/ISourceOptions";

export default class BCWrapperFactory implements IBCWrapperFactory {
  private _global: BCWrapper;
  public readonly all: Array<BCWrapper> = new Array<BCWrapper>();
  public get global(): BCWrapper {
    return this._global ?? (this._global = this.new());
  }

  public readonly util: IUtilWrapper = new UtilWrapper();

  public addFragment(selector: string): BCWrapper;
  public addFragment(element: Element): BCWrapper;
  public addFragment(param: any): BCWrapper {
    return this.global.addFragment(param);
  }

  public setOptions(options: IHostOptions): BCWrapper {
    return this.global.setOptions(options);
  }

  public run(): BCWrapper {
    return this.global.run();
  }

  public setSource(sourceId: SourceId, data: any, options?: ISourceOptions) {
    return this.run().setSource(sourceId, data, options);
  }

  public new(): BCWrapper {
    var retVal = new BCWrapper();
    this.all.push(retVal);
    return retVal;
  }
}
