import IBCWrapper from "./IBCWrapper";

export default interface IBCWrapperFactory extends IBCWrapper {
  all: Array<IBCWrapper>;
  global: IBCWrapper;
}
