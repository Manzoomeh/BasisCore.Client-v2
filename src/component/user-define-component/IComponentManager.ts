import ISource from "../../data/ISource";

export default interface IComponentManager {
  initializeAsync(): Promise<void>;
  runAsync(source?: ISource): Promise<boolean>;
}
