export default interface IBasisCore {
  setArea(selector: string): void;
  setArea(element?: Element): void;
  setArea(param?: any): void;

  // GetDefault(key: string): string;
  // GetDefault(key: string, defaultValue: string): string;
  // GetDefault(key: any, defaultValue?: any);

  GetOrLoadDbLibAsync(): Promise<any>;

  addSource(sourecName: string, data: any, replace: boolean);
}
