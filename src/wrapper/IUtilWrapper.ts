import ISourceWrapper from "./ISourceWrapper";

export default interface IUtilWrapper {
  cloneDeep<T>(obj: T): T;
  getLibAsync(objectName: string, url: string): Promise<any>;

  source: ISourceWrapper;
}
