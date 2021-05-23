import { EventHandler } from "./EventHandler";

export default interface IEvent<T> {
  Add(handler: EventHandler<T>): boolean;
  Remove(handler: EventHandler<T>): boolean;
}
