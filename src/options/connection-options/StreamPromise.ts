import IDictionary from "../../IDictionary";

export default class StreamPromise<T> extends Promise<T> {
  private getSocket: () => WebSocket | null;
  public readonly connectionName: string;

  constructor(
    connectionName: string,
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ) => void,
    getSocket: () => WebSocket | null
  ) {
    super(executor);
    this.connectionName = connectionName;
    this.getSocket = getSocket;
  }

  send(parameters: IDictionary<string>) {
    const socket = this.getSocket();
    socket?.send(JSON.stringify(parameters));
  }

  get isOpen() {
    return this.getSocket() == null ? false : true;
  }
}
