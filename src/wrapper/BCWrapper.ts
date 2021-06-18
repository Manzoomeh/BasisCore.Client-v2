import { container } from "tsyringe";
import IBasisCore from "../IBasisCore";
import IHostOptions from "../options/IHostOptions";
import ClientException from "../exception/ClientException";
import { SourceId } from "../type-alias";
import EventManager from "../event/EventManager";
import { MergeType } from "../enum";

export default class BCWrapper {
  private readonly elementList: Array<Element> = new Array<Element>();
  private hostSetting?: Partial<IHostOptions> = null;
  private _basiscore: IBasisCore = null;
  public manager: EventManager<IBasisCore> = new EventManager<IBasisCore>();

  public get basiscore(): IBasisCore {
    return this._basiscore;
  }

  public addFragment(selector: string): BCWrapper;
  public addFragment(element: Element): BCWrapper;
  public addFragment(param: any): BCWrapper {
    if (this._basiscore) {
      throw new ClientException(
        "Can't add fragment for already builded bc object."
      );
    } else {
      if (typeof param === "string") {
        this.elementList.push(...document.querySelectorAll(param));
      } else if (param instanceof Element) {
        this.elementList.push(param);
      } else {
        throw new ClientException("Invalid selector");
      }
      return this;
    }
  }

  public setOptions(options: Partial<IHostOptions>): BCWrapper {
    if (this._basiscore) {
      throw new ClientException(
        "Can't set option for already builded bc object."
      );
    }
    this.hostSetting = options;
    return this;
  }

  public run(): BCWrapper {
    if (!this._basiscore) {
      const childContainer = container.createChildContainer();
      childContainer.register("IHostOptions", {
        useValue: this.hostSetting ?? {},
      });
      childContainer.register("root.nodes", {
        useValue:
          this.elementList.length == 0
            ? [document.documentElement]
            : this.elementList,
      });
      childContainer.register("container", { useValue: childContainer });
      this._basiscore = childContainer.resolve<IBasisCore>("IBasisCore");
      this.manager.Trigger(this._basiscore);
    }
    return this;
  }

  public setSource(sourceId: SourceId, data: any, mergeType: MergeType) {
    if (!this._basiscore) {
      this.run();
    } else {
      this._basiscore.setSource(sourceId, data, mergeType);
    }
  }
}
