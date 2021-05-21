import "reflect-metadata";
import { container } from "tsyringe";
import BasisCore from "./BasisCore";
import IBasisCore from "./IBasisCore";
import ConsoleLogger from "./logger/ConsoleLogger";
import ILogger from "./logger/ILogger";
import { HostOptions } from "./options/HostOptions";
import IHostOptions from "./options/IHostOptions";
import IRepository from "./repository/IRepository";
import Repository from "./repository/Repository";

//https://github.com/microsoft/tsyringe#example-with-interfaces

container.register<IHostOptions>("IHostOptions", {
  useToken: HostOptions,
});
container.register<IBasisCore>("IBasisCore", {
  useToken: BasisCore,
});
container.register<ILogger>("ILogger", {
  useToken: ConsoleLogger,
});

container.register<IRepository>("IRepository", {
  useToken: Repository,
});
