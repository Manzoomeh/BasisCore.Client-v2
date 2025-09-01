import "./tsyringe.config";
import "./extension/StringExtensions";
import "./extension/ElementExtensions";
import { HostOptions } from "./options/HostOptions";
import LocalDataBase from "./repository/LocalDataBase";
import { MergeType } from "./enum";
import BCWrapperFactory from "./wrapper/BCWrapperFactory";
import ExposerComponent from "./component/user-define-component/component/ExposerComponent";
import BasisCore from "./BasisCore";
import CallComponent from "./component/collection/CallComponent";
import GroupComponent from "./component/collection/GroupComponent";
import RepeaterComponent from "./component/collection/RepeaterComponent";
import HTMLFormComponent from "./component/html-element/HTMLFormComponent";
import HTMLInputComponent from "./component/html-element/HTMLInputComponent";
import HTMLIUnknownComponent from "./component/html-element/HTMLIUnknownComponent";
import HTMLSelectComponent from "./component/html-element/HTMLSelectComponent";
import CookieComponent from "./component/management/CookieComponent";
import ListComponent from "./component/renderable/ListComponent";
import PrintComponent from "./component/renderable/PrintComponent";
import IQuestionSchema from "./component/renderable/schema/IQuestionSchema";
import IUserActionResult from "./component/renderable/schema/IUserActionResult";
import SchemaComponent from "./component/renderable/schema/SchemaComponent";
import ChartComponent from "./component/chart/ChartComponent";
import TreeComponent from "./component/renderable/TreeComponent";
import ViewComponent from "./component/renderable/ViewComponent";
import APIComponent from "./component/source/APIComponent";
import CallbackComponent from "./component/source/CallbackComponent";
import DbSourceComponent from "./component/source/DbSourceComponent";
import UserDefineComponent from "./component/user-define-component/UserDefineComponent";
import LocalContext from "./context/LocalContext";
import EventManager from "./event/EventManager";
import IDependencyContainer from "./IDependencyContainer";

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


version:2.39.4`,

  " background: yellow;color: #0078C1; font-size: 2rem; font-family: Arial; font-weight: bolder",
  "color: #0078C1; font-size: 1rem; font-family: Arial;"
);

const $bc = new BCWrapperFactory();
(global as any).$bc = $bc;

const loadListener = (_) => {
  window.removeEventListener("load", loadListener);
  if ($bc.all.length == 0 && HostOptions.defaultSettings.autoRender) {
    $bc.run();
  }
};
window.addEventListener("load", loadListener);

export {
  BasisCore,
  CallComponent,
  GroupComponent,
  RepeaterComponent,
  HTMLFormComponent,
  HTMLInputComponent,
  HTMLIUnknownComponent,
  HTMLSelectComponent,
  CookieComponent,
  ListComponent,
  PrintComponent,
  TreeComponent,
  ViewComponent,
  SchemaComponent,
  ChartComponent,
  APIComponent,
  CallbackComponent,
  DbSourceComponent,
  UserDefineComponent,
  LocalContext,
  BCWrapperFactory,
  MergeType,
  LocalDataBase,
  HostOptions,
  IDependencyContainer,
  IQuestionSchema,
  IUserActionResult,
  EventManager,
  $bc,
  ExposerComponent as exposer,
};
