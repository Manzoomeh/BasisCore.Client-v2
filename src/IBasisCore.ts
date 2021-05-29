import { SourceId } from "./type-alias";

export default interface IBasisCore {
  addArea(selector: string): void;
  addArea(element?: Element): void;
  addArea(param?: any): void;

  // GetDefault(key: string): string;
  // GetDefault(key: string, defaultValue: string): string;
  // GetDefault(key: any, defaultValue?: any);

  // getOrLoadDbLibAsync(): Promise<any>;
  // getOrLoadObjectAsync(object: string, url: string): Promise<any>;

  setSource(sourceId: SourceId, data: any, replace: boolean);
  run(): void;
}
