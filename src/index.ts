import "./tsyringe.config";
import "./extension/StringExtensions";
import "./extension/ElementExtensions";
import { container } from "tsyringe";
import IBasisCore from "./IBasisCore";
import IHostOptions from "./options/IHostOptions";
import ClientException from "./exception/ClientException";

//const basisCore = container.resolve<IBasisCore>("IBasisCore");
function bc(hostSetting: IHostOptions, selector: string): IBasisCore;
function bc(hostSetting: IHostOptions, element: Element): IBasisCore;
function bc(hostSetting: IHostOptions, param?: any): IBasisCore {
  var elementList: Array<Element>;
  if (typeof param === "string") {
    elementList = Array.from(document.querySelectorAll(param));
  } else if (param instanceof Element) {
    elementList = [param];
  } else {
    throw new ClientException("Invalid Argument");
  }
  const childContainer = container.createChildContainer();
  childContainer.register("host", { useValue: hostSetting ?? {} });
  childContainer.register("root.nodes", { useValue: elementList });
  childContainer.register("container", { useValue: childContainer });

  return childContainer.resolve<IBasisCore>("IBasisCore");
}

(global as any).$bc = bc;
// window.addEventListener("DOMContentLoaded", (e) => {
//   basisCore.setArea(document.documentElement);
// });

// class p {
//   constructor(public readonly e: Array<Node>) {}
// }
