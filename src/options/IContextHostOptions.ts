import IHostOptions from "./IHostOptions";

export default interface IContextHostOptions extends IHostOptions {
  getDefault<T>(key: string, defaultValue?: T): T;
}
