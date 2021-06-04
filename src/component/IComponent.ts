import { Priority } from "../enum";

export default interface IComponent {
  priority: Priority;
  readonly busy: boolean;
  initializeAsync(): Promise<void>;
  processAsync(): Promise<void>;
}
