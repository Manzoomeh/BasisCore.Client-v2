import { EventHandler } from "./EventHandler";

export default interface IEvent<T> {
  Add(handler: EventHandler<T>): EventHandler<T>;
  Remove(handler: EventHandler<T>): EventHandler<T>;
}
