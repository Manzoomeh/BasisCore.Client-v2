import "./tsyringe.config";
import "./extension/StringExtensions";
import "./extension/ElementExtensions";
import { container } from "tsyringe";
import IBasisCore from "./IBasisCore";
import IHostOptions from "./options/IHostOptions";
import ClientException from "./exception/ClientException";
import { HostOptions } from "./options/HostOptions";
import { SourceId } from "./type-alias";

class BCWrapper implements IBasisCore {
  private readonly elementList: Array<Element> = new Array<Element>();
  private hostSetting?: IHostOptions = null;
  private basiscore: IBasisCore = null;
  private static current: BCWrapper;
  public static get instance(): BCWrapper {
    return BCWrapper.current;
  }

  constructor() {}

  public static addArea(selector: string): BCWrapper;
  public static addArea(element: Element): BCWrapper;
  public static addArea(param: any): BCWrapper {
    var retVal: BCWrapper =
      BCWrapper.current ?? (BCWrapper.current = new BCWrapper());
    return retVal.addArea(param);
  }

  public addArea(selector: string): BCWrapper;
  public addArea(element: Element): BCWrapper;
  public addArea(param: any): BCWrapper {
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
    var retVal: BCWrapper =
      BCWrapper.current ?? (BCWrapper.current = new BCWrapper());
    return retVal.setOptions(options);
  }

  public setOptions(options: IHostOptions): BCWrapper {
    if (this.basiscore) {
      throw new ClientException(
        "Can't set option for already builded bc object."
      );
    }
    this.hostSetting = options;
    return this;
  }

  public static build(): BCWrapper {
    var retVal: BCWrapper =
      BCWrapper.current ?? (BCWrapper.current = new BCWrapper());
    return retVal.build();
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
    } else {
      this.basiscore.run();
    }
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

(global as any).$bc = BCWrapper;
