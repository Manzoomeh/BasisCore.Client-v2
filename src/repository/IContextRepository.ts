import ISource from "../data/ISource";
import EventManager from "../event/EventManager";
import IRepository from "./IRepository";

export default interface IContextRepository extends IRepository {
  resolves: Map<string, EventManager<ISource>>;
  setSourceFromOwner(source: ISource): void;
}
