export default interface IComponent {
  initializeAsync(): Promise<void>;
}
