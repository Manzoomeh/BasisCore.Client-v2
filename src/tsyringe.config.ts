//https://github.com/microsoft/tsyringe#example-with-interfaces
import "reflect-metadata";
import { container } from "tsyringe";
import BasisCore from "./BasisCore";
import CallComponent from "./component/collection/CallComponent";
import GroupComponent from "./component/collection/GroupComponent";
import RepeaterComponent from "./component/collection/RepeaterComponent";
import HTMLButtonComponent from "./component/html-element/HTMLButtonComponent";
import HTMLFormComponent from "./component/html-element/HTMLFormComponent";
import HTMLInputComponent from "./component/html-element/HTMLInputComponent";
import HTMLSelectComponent from "./component/html-element/HTMLSelectComponent";
import CookieComponent from "./component/management/CookieComponent";
import ListComponent from "./component/renderable/ListComponent";
import PrintComponent from "./component/renderable/PrintComponent";
import TreeComponent from "./component/renderable/TreeComponent";
import ViewComponent from "./component/renderable/ViewComponent";
import CallbackComponent from "./component/source/CallbackComponent";
import DbSourceComponent from "./component/source/DbSourceComponent";

import ConsoleLogger from "./logger/ConsoleLogger";
import Repository from "./repository/Repository";

container.register("IBasisCore", { useToken: BasisCore });
container.register("ILogger", { useToken: ConsoleLogger });
container.register("IContextRepository", { useToken: Repository });

container.register("print", { useToken: PrintComponent });
container.register("tree", { useToken: TreeComponent });
container.register("view", { useToken: ViewComponent });
container.register("list", { useToken: ListComponent });
container.register("cookie", { useToken: CookieComponent });
container.register("call", { useToken: CallComponent });
container.register("group", { useToken: GroupComponent });
container.register("repeater", { useToken: RepeaterComponent });
container.register("callback", { useToken: CallbackComponent });

container.register("dbsource", { useToken: DbSourceComponent });

container.register("button", { useToken: HTMLButtonComponent });
container.register("input", { useToken: HTMLInputComponent });
container.register("select", { useToken: HTMLSelectComponent });
container.register("form", { useToken: HTMLFormComponent });
// container.register("input", {
//   useFactory: (c) => {
//     var element = c.resolve<Element>("element");
//     return c.resolve(element.getAttribute("type")?.toLowerCase() ?? "text");
//   },
// });
