import "./tsyringe.config";
import "./extentions/StringExtentions";
import "./extentions/ElementExtentions";
import { container } from "tsyringe";
import IBasisCore from "./IBasisCore";

const basisCore = container.resolve<IBasisCore>("IBasisCore");

(global as any).$bc = basisCore;
window.onload = () => {
  (global as any).$bc.AddArea(document.documentElement);
  // console.log(container.resolve("IHostOptions"));
  // console.log(container.resolve("IHostOptions"));
};
