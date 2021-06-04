import { container } from "tsyringe";
import IBasisCore from "./IBasisCore";
import IHostOptions from "./options/IHostOptions";
import ClientException from "./exception/ClientException";
import { HostOptions } from "./options/HostOptions";
import { SourceId } from "./type-alias";

export class BCWrapper implements IBasisCore {
  private readonly elementList: Array<Element> = new Array<Element>();
  private hostSetting?: Partial<IHostOptions> = null;
  private basiscore: IBasisCore = null;
  private static _global: BCWrapper;
  public static get global(): BCWrapper {
    return BCWrapper._global ?? (BCWrapper._global = BCWrapper.new());
  }

  static wrappers: Array<BCWrapper> = new Array<BCWrapper>();

  constructor() {}

  public static new(): BCWrapper {
    var retVal = new BCWrapper();
    BCWrapper.wrappers.push(retVal);
    return retVal;
  }

  public static addFragment(selector: string): BCWrapper;
  public static addFragment(element: Element): BCWrapper;
  public static addFragment(param: any): BCWrapper {
    return BCWrapper.global.addFragment(param);
  }

  public addFragment(selector: string): BCWrapper;
  public addFragment(element: Element): BCWrapper;
  public addFragment(param: any): BCWrapper {
    if (typeof param === "string") {
      this.elementList.push(...document.querySelectorAll(param));
    } else if (param instanceof Element) {
      this.elementList.push(param);
    } else {
      throw new ClientException("Invalid selector");
    }
    return this;
  }

  public static setOptions(options: IHostOptions): BCWrapper {
    return BCWrapper.global.setOptions(options);
  }

  public setOptions(options: Partial<IHostOptions>): BCWrapper {
    if (this.basiscore) {
      throw new ClientException(
        "Can't set option for already builded bc object."
      );
    }
    this.hostSetting = options;
    return this;
  }

  public static build(): BCWrapper {
    return BCWrapper.global.build();
  }

  public build(): BCWrapper {
    if (!this.basiscore) {
      const childContainer = container.createChildContainer();
      childContainer.register("host", {
        useValue: this.hostSetting ?? HostOptions.defaultSettings,
      });
      childContainer.register("root.nodes", {
        useValue:
          this.elementList.length == 0
            ? [document.documentElement]
            : this.elementList,
      });
      childContainer.register("container", { useValue: childContainer });
      this.basiscore = childContainer.resolve<IBasisCore>("IBasisCore");
    }
    return this;
  }

  public static run(): BCWrapper {
    return BCWrapper.build().run();
  }

  public run(): BCWrapper {
    if (!this.basiscore) {
      this.build();
    }
    this.basiscore.run();
    return this;
  }

  public static setSource(sourceId: SourceId, data: any, replace: boolean) {
    return BCWrapper.run().setSource(sourceId, data, replace);
  }

  public setSource(sourceId: SourceId, data: any, replace: boolean) {
    if (!this.basiscore) {
      this.run();
    } else {
      this.basiscore.setSource(sourceId, data, replace);
    }
  }
}
