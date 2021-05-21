export default interface ILogger {
  LogError(message: string, exception: Error): void;
  LogInformation(message: string): void;
  LogWarning(message: string): void;
}
