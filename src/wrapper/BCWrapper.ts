import { container } from "tsyringe";
import IBasisCore from "../IBasisCore";
import IHostOptions from "../options/IHostOptions";
import ClientException from "../exception/ClientException";
import { SourceId } from "../type-alias";
import EventManager from "../event/EventManager";
import ISourceOptions from "../context/ISourceOptions";
import IBCWrapper from "./IBCWrapper";

export default class BCWrapper implements IBCWrapper {
  readonly elementList: Array<Element> = new Array<Element>();
  private hostSetting?: Partial<IHostOptions> = null;
  private _basiscore: IBasisCore = null;
  public manager: EventManager<IBasisCore> = new EventManager<IBasisCore>();

  public get basiscore(): IBasisCore {
    return this._basiscore;
  }

  public addFragment(selector: string): IBCWrapper;
  public addFragment(element: Element): IBCWrapper;
  public addFragment(param: any): IBCWrapper {
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

  public setOptions(options: Partial<IHostOptions>): IBCWrapper {
    if (this._basiscore) {
      throw new ClientException(
        "Can't set option for already builded bc object."
      );
    }
    this.hostSetting = options;
    return this;
  }

  public run(): IBCWrapper {
    if (!this._basiscore) {
      const childContainer = container.createChildContainer();
      childContainer.register("IHostOptions", {
        useValue: this.hostSetting ?? {},
      });
      if (this.elementList.length == 0) {
        this.addFragment("html");
      }
      childContainer.register("root.nodes", {
        useValue: this.elementList,
      });
      childContainer.register("container", { useValue: childContainer });
      this._basiscore = childContainer.resolve<IBasisCore>("IBasisCore");
      this.manager.Trigger(this._basiscore);
    }
    return this;
  }

  public setSource(
    sourceId: SourceId,
    data: any,
    options?: ISourceOptions
  ): IBCWrapper {
    if (!this._basiscore) {
      this.run();
    } else {
      this._basiscore.setSource(sourceId, data, options);
    }
    return this;
  }
}
