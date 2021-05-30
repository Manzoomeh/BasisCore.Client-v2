import { SourceId } from "./type-alias";

export default interface IBasisCore {
  addFragment(selector: string): void;
  addFragment(element?: Element): void;
  addFragment(param?: any): void;

  setSource(sourceId: SourceId, data: any, replace: boolean);

  run(): void;
}
