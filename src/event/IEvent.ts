import { EventHandler } from "./EventHandler";

export default interface IEvent<T> {
  Add(handler: EventHandler<T>): void;
  Remove(handler: EventHandler<T>): void;
}
