import { SourceId } from "./type-alias";

export default interface IBasisCore {
  setArea(selector: string): void;
  setArea(element?: Element): void;
  setArea(param?: any): void;

  // GetDefault(key: string): string;
  // GetDefault(key: string, defaultValue: string): string;
  // GetDefault(key: any, defaultValue?: any);

  getOrLoadDbLibAsync(): Promise<any>;
  getOrLoadObjectAsync(object: string, url: string): Promise<any>;

  addSource(sourecId: SourceId, data: any, replace: boolean);

  runAsync();
}
