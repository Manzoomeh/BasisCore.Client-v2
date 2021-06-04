import "./tsyringe.config";
import "./extension/StringExtensions";
import "./extension/ElementExtensions";
import { HostOptions } from "./options/HostOptions";
import { BCWrapper } from "./BCWrapper";

console.log(
  `%cWelcome To BasisCore Ecosystem%c
follow us on https://BasisCore.com/
version:2.0.0`,
  " background: yellow;color: #0078C1; font-size: 2rem; font-family: Arial; font-weight: bolder",
  "color: #0078C1; font-size: 1rem; font-family: Arial;"
);

(global as any).$bc = BCWrapper;

window.addEventListener("load", (x) => {
  if (
    BCWrapper.wrappers.length == 0 &&
    HostOptions.defaultSettings.autoRender
  ) {
    BCWrapper.run();
  }
});
