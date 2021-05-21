import { EventHandler } from "./EventHandler";
import IEvent from "./IEvent";
import IEventManager from "./IEventManager";

export default class EventManager<T> implements IEvent<T>, IEventManager<T> {
  private readonly handlers: Array<EventHandler<T>> = new Array<
    EventHandler<T>
  >();

  public Add(handler: EventHandler<T>): void {
    this.handlers.push(handler);
  }

  public Remove(handler: EventHandler<T>): void {
    const index = this.handlers.indexOf(handler);
    if (index != -1) {
      this.handlers.slice(index, 1);
    }
  }

  public Trigger(args?: T) {
    this.handlers.forEach((h) => {
      try {
        h(args);
      } catch (e) {
        console.error(e);
      }
    });
  }
}
