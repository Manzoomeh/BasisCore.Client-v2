import "./tsyringe.config";
import "./extension/StringExtensions";
import "./extension/ElementExtensions";
import { HostOptions } from "./options/HostOptions";
import { BCWrapper } from "./wrapper/BCWrapper";
import LocalDataBase from "./repository/LocalDataBase";
import { AppendType } from "./enum";

console.log(
  `%cWelcome To BasisCore Ecosystem%c
follow us on https://BasisCore.com/
version:2.0.10`,
  " background: yellow;color: #0078C1; font-size: 2rem; font-family: Arial; font-weight: bolder",
  "color: #0078C1; font-size: 1rem; font-family: Arial;"
);

(window as any).LocalDataBase = LocalDataBase;
(global as any).$bc = BCWrapper;
(window as any).AppendType = AppendType;

window.addEventListener("load", (x) => {
  if (
    BCWrapper.wrappers.length == 0 &&
    HostOptions.defaultSettings.autoRender
  ) {
    BCWrapper.run();
  }
});
