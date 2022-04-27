import "./tsyringe.config";
import "./extension/StringExtensions";
import "./extension/ElementExtensions";
import { HostOptions } from "./options/HostOptions";
import LocalDataBase from "./repository/LocalDataBase";
import { MergeType } from "./enum";
import BCWrapperFactory from "./wrapper/BCWrapperFactory";
import ExposerComponent from "./component/user-define-component/component/ExposerComponent";

console.log(
  `
______           _                               _ _            _   
| ___ \\         (_)                             | (_)          | |  
| |_/ / __ _ ___ _ ___  ___ ___  _ __ ___    ___| |_  ___ _ __ | |_ 
| ___ \\/ _\` / __| / __|/ __/ _ \\| '__/ _ \\  / __| | |/ _ \\ '_ \\| __|
| |_/ / (_| \\__ \\ \\__ \\ (_| (_) | | |  __/ | (__| | |  __/ | | | |_ 
\\____/ \\__,_|___/_|___/\\___\\___/|_|  \\___|  \\___|_|_|\\___|_| |_|\\__|
                                                                    
%cWelcome To BasisCore Ecosystem%c
follow us on https://BasisCore.com/
version:2.10`,
  " background: yellow;color: #0078C1; font-size: 2rem; font-family: Arial; font-weight: bolder",
  "color: #0078C1; font-size: 1rem; font-family: Arial;"
);

const $bc = new BCWrapperFactory();
(window as any).LocalDataBase = LocalDataBase;
(global as any).$bc = $bc;
(window as any).MergeType = MergeType;

//component types
(window as any).exposer = ExposerComponent;

const loadListener = (_) => {
  window.removeEventListener("load", loadListener);
  if ($bc.all.length == 0 && HostOptions.defaultSettings.autoRender) {
    $bc.run();
  }
};
window.addEventListener("load", loadListener);
