import ISource from "../data/ISource";
import EventManager from "../event/EventManager";
import IRepository from "./IRepository";

export default interface IContextRepository extends IRepository {
  Resolves: Map<string, EventManager<ISource>>;
}
