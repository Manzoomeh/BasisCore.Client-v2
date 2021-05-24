//https://github.com/microsoft/tsyringe#example-with-interfaces
import "reflect-metadata";
import { container } from "tsyringe";
import BasisCore from "./BasisCore";
import CallComponent from "./component/collection/CallComponent";
import GroupComponent from "./component/collection/GroupComponent";
import CookieComponent from "./component/management/CookieComponent";
import ListComponent from "./component/renderable/ListComponent";
import PrintComponent from "./component/renderable/PrintComponent";
import TreeComponent from "./component/renderable/TreeComponent";
import ViewComponent from "./component/renderable/ViewViewComponent";
import ConsoleLogger from "./logger/ConsoleLogger";
import { HostOptions } from "./options/HostOptions";
import Repository from "./repository/Repository";

container.register("IHostOptions", { useToken: HostOptions });
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
