import { EventHandler } from "./EventHandler";
import IEvent from "./IEvent";
import IEventManager from "./IEventManager";

export default class EventManager<T> implements IEvent<T>, IEventManager<T> {
  private readonly handlers: Set<EventHandler<T>> = new Set<EventHandler<T>>();

  public Add(handler: EventHandler<T>): EventHandler<T> {
    let retVal = null;
    if (typeof handler !== "function") {
      throw "handler null or is not function!";
    }
    if (!this.handlers.has(handler)) {
      this.handlers.add(handler);
      retVal = handler;
    }
    return retVal;
  }

  public Remove(handler: EventHandler<T>): EventHandler<T> {
    let retVal = null;
    if (this.handlers.has(handler)) {
      this.handlers.delete(handler);
      retVal = handler;
    }
    return retVal;
  }

  public Trigger(args?: T) {
    this.handlers.forEach((handler) => {
      try {
        handler(args);
      } catch (e) {
        console.error(e);
      }
    });
  }
}
