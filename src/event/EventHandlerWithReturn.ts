export type EventHandlerWithReturn<TArgument, TReturn> = {
  (args?: TArgument): TReturn;
};
