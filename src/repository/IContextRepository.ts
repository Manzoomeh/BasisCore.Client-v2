import ISource from "../data/ISource";
import EventManager from "../event/EventManager";
import { SourceId } from "../type-alias";
import IRepository from "./IRepository";

export default interface IContextRepository extends IRepository {
  resolves: Map<string, EventManager<ISource>>;
  eventManager: Map<SourceId, EventManager<ISource>>;
}
