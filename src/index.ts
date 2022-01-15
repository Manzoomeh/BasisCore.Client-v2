import "./tsyringe.config";
import "./extension/StringExtensions";
import "./extension/ElementExtensions";
import { HostOptions } from "./options/HostOptions";
import LocalDataBase from "./repository/LocalDataBase";
import { MergeType } from "./enum";
import BCWrapperFactory from "./wrapper/BCWrapperFactory";

console.log(
  `%cWelcome To BasisCore Ecosystem%c
follow us on https://BasisCore.com/
version:2.4.13`,
  " background: yellow;color: #0078C1; font-size: 2rem; font-family: Arial; font-weight: bolder",
  "color: #0078C1; font-size: 1rem; font-family: Arial;"
);

const $bc = new BCWrapperFactory();
(window as any).LocalDataBase = LocalDataBase;
(global as any).$bc = $bc;
(window as any).MergeType = MergeType;

const loadListener = (_) => {
  window.removeEventListener("load", loadListener);
  if ($bc.all.length == 0 && HostOptions.defaultSettings.autoRender) {
    $bc.run();
  }
};
window.addEventListener("load", loadListener);
