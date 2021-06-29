import ISourceWrapper from "./ISourceWrapper";

export default interface IUtilWrapper {
  cloneDeep<T>(obj: T): T;
  defaultsDeep<T>(data: Partial<T>, defaults: Partial<T>): T;
  getLibAsync(objectName: string, url: string): Promise<any>;

  source: ISourceWrapper;
}
