import { container } from "tsyringe";
import IBasisCore from "../IBasisCore";
import IHostOptions from "../options/IHostOptions";
import IPushOptions from "../options/IPushOptions";
import ClientException from "../exception/ClientException";
import { SourceId } from "../type-alias";
import EventManager from "../event/EventManager";
import ISourceOptions from "../context/ISourceOptions";
import IBCWrapper from "./IBCWrapper";
import IComponent from "../component/IComponent";
import CommandComponent from "../component/CommandComponent";

export default class BCWrapper implements IBCWrapper {
  private static _serviceWorkerAdded: boolean = false;
  public elementList: Array<Element> = null;
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
      if (!this.elementList) {
        this.elementList = new Array<Element>();
      }
      if (typeof param === "string") {
        const newElements = document.querySelectorAll(param);
        if (newElements.length === 0) {
          console.warn(`Selector '${param}' don't refer to any element(s).`);
        } else {
          this.elementList.push(...newElements);
        }
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
    if (this.elementList?.length == 0) {
      throw new ClientException("No element(s) selected for start rendering!");
    }
    if (!this._basiscore) {
      const childContainer = container.createChildContainer();
      childContainer.register("IHostOptions", {
        useValue: this.hostSetting ?? {},
      });
      if (!this.elementList) {
        this.addFragment(document.documentElement);
      }
      childContainer.register("root.nodes", {
        useValue: this.elementList,
      });
      childContainer.register("dc", { useValue: childContainer });
      this._basiscore = childContainer.resolve<IBasisCore>("IBasisCore");
      const options = this._basiscore.context.options;
      if (options.serviceWorker) {
        if (BCWrapper._serviceWorkerAdded) {
          console.warn(
            "Try add service worker more than one.",
            this._basiscore.context.options
          );
        } else {
          BCWrapper._serviceWorkerAdded = true;
          this.tryAddServiceWorkerAsync();
        }
      }
      this.manager.Trigger(this._basiscore);
    }
    return this;
  }

  private tryAddServiceWorkerAsync() {
    const options = this._basiscore.context.options;
    const filePath =
      typeof options.serviceWorker === "string"
        ? options.serviceWorker
        : "basiscore-serviceWorker.js";
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(filePath).then(
        (reg) => {
          console.log(
            `Service worker from '${filePath}' register successfully!`
          );
          this.tryActivePushService(reg);
        },
        (e) => console.error("Error in register service worker", e)
      );
    }
  }

  private tryActivePushService(reg: ServiceWorkerRegistration) {
    const options = this._basiscore.context.options.push;

    const showDeniedError = () =>
      console.error(
        "Your browser does not support Push Notifications or you have blocked notifications"
      );

    const trySendSubscriptionDataToServerAsync = (
      sub: PushSubscription,
      options: IPushOptions
    ) => {
      const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
        var binary = "";
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
      };

      const formData = new FormData();
      if (options.params) {
        Object.getOwnPropertyNames(options.params).forEach((key) =>
          formData.append(key, options.params[key])
        );
      }
      formData.append("endpoint", sub.endpoint);
      formData.append("p256dh", arrayBufferToBase64(sub.getKey("p256dh")));
      formData.append("auth", arrayBufferToBase64(sub.getKey("auth")));

      fetch(options.url, {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        body: formData,
      }).then(
        async (result) => {
          if (result.ok) {
            console.log(
              "Push Notification is activated. Subscription data send for server successfully!",
              await result.text()
            );
          } else {
            console.error(
              `Error in send Push subscription data for server [${result.status} (${result.statusText})]. Unable to activate Push Notification!`
            );
          }
        },
        (er) =>
          console.error(
            "Error in send Push subscription data send for server. Unable to activate Push Notification!",
            er
          )
      );
    };

    const tryGetSubscriptionAsync = (reg) => {
      reg.pushManager.getSubscription().then((sub: PushSubscription) => {
        if (sub === null) {
          reg.pushManager
            .subscribe({
              userVisibleOnly: true,
              applicationServerKey: options.applicationServerKey,
            })
            .then(
              (sub: PushSubscription) =>
                trySendSubscriptionDataToServerAsync(sub, options),
              (er) =>
                console.error(
                  "Unable to subscribe to push. Unable to activate Push Notification!",
                  er
                )
            );
        } else {
          trySendSubscriptionDataToServerAsync(sub, options);
        }
      });
    };

    if (options) {
      if (Notification.permission === "granted") {
        tryGetSubscriptionAsync(reg);
      } else if ((Notification.permission as any) === "blocked") {
        showDeniedError();
      } else {
        Notification.requestPermission((status) => {
          if (status == "granted") {
            tryGetSubscriptionAsync(reg);
          } else {
            showDeniedError();
          }
        });
      }
    }
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

  public GetCommandListByCore(core: string): CommandComponent[] {
    return this._basiscore.GetCommandListByCore(core);
  }

  public GetCommandList(): CommandComponent[] {
    return this._basiscore.GetCommandList();
  }

  public GetComponentList(): IComponent[] {
    return this._basiscore.GetComponentList();
  }
}
