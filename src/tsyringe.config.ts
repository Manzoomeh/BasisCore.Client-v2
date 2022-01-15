//https://github.com/microsoft/tsyringe#example-with-interfaces
import "reflect-metadata";
import { container } from "tsyringe";
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
import TreeComponent from "./component/renderable/TreeComponent";
import ViewComponent from "./component/renderable/ViewComponent";
import SchemaComponent from "./component/renderable/schema/SchemaComponent";
import APIComponent from "./component/source/APIComponent";
import CallbackComponent from "./component/source/CallbackComponent";
import DbSourceComponent from "./component/source/DbSourceComponent";
import UserDefineComponent from "./component/user-define-component/UserDefineComponent";
import LocalContext from "./context/LocalContext";

import ConsoleLogger from "./logger/ConsoleLogger";
import Repository from "./repository/Repository";
import { SchemaListComponent } from "./component/renderable/schema-list/SchemaListComponent";
import InlineSourceComponent from "./component/source/InlineSourceComponent";

container.register("IBasisCore", { useToken: BasisCore });
container.register("ILogger", { useToken: ConsoleLogger });
container.register("IContextRepository", { useToken: Repository });
container.register("ILocalContext", { useToken: LocalContext });

container.register("print", { useToken: PrintComponent });
container.register("tree", { useToken: TreeComponent });
container.register("view", { useToken: ViewComponent });
container.register("list", { useToken: ListComponent });
container.register("list", { useToken: ListComponent });
container.register("schema", { useToken: SchemaComponent });
container.register("schemalist", { useToken: SchemaListComponent });

container.register("cookie", { useToken: CookieComponent });
container.register("call", { useToken: CallComponent });
container.register("group", { useToken: GroupComponent });
container.register("repeater", { useToken: RepeaterComponent });
container.register("callback", { useToken: CallbackComponent });
container.register("dbsource", { useToken: DbSourceComponent });
container.register("inlinesource", { useToken: InlineSourceComponent });

container.register("input", { useToken: HTMLInputComponent });
container.register("select", { useToken: HTMLSelectComponent });
container.register("form", { useToken: HTMLFormComponent });
container.register("unknown-html", { useToken: HTMLIUnknownComponent });

container.register("api", { useToken: APIComponent });
container.register("component", { useToken: UserDefineComponent });
