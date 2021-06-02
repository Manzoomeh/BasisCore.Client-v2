import { Priority } from "../enum";

export default interface IComponent {
  priority: Priority;

  initializeAsync(): Promise<void>;
  renderAsync(fromTrigger: boolean): Promise<void>;
}
