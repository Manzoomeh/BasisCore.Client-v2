import { Priority } from "../enum";
import IDisposable from "../IDisposable";

export default interface IComponent extends IDisposable {
  priority: Priority;
  readonly busy: boolean;
  initializeAsync(): Promise<void>;
  processAsync(): Promise<void>;
}
