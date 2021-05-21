export default interface IBasisCore {
  AddArea(selector: string): void;
  AddArea(element?: Element): void;
  AddArea(param?: any): void;

  GetDefault(key: string): string;
  GetDefault(key: string, defaultValue: string): string;
  GetDefault(key: any, defaultValue?: any);

  GetOrLoadDbLibAsync(): Promise<any>;

  addSource(sourecName: string, data: any);
}
