import { EventHandler } from "./EventHandler";
import IEvent from "./IEvent";
import IEventManager from "./IEventManager";

export default class EventManager<T> implements IEvent<T>, IEventManager<T> {
  private readonly handlers: Set<EventHandler<T>> = new Set<EventHandler<T>>();

  public Add(handler: EventHandler<T>): boolean {
    let retVal = false;
    // console.log(
    //   this.handlers.has(handler),
    //   this.handlers.size,
    //   this.handlers,
    //   handler
    // );
    if (!this.handlers.has(handler)) {
      this.handlers.add(handler);
      retVal = true;
    }
    // console.log(
    //   this.handlers.has(handler),
    //   this.handlers.size,
    //   this.handlers,
    //   handler,
    //   this.handlers.keys()
    // );
    return retVal;
  }

  public Remove(handler: EventHandler<T>): boolean {
    let retVal = false;
    if (this.handlers.has(handler)) {
      this.handlers.delete(handler);
      retVal = true;
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
