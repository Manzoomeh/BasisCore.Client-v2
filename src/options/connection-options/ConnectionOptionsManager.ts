import IContext from "../../context/IContext";
import ConfigNotFoundException from "../../exception/ConfigNotFoundException";
import { HostSetting } from "../../type-alias";
import ConnectionOptions from "./ConnectionOptions";
import LocalStorageConnectionOptions from "./LocalStorageConnectionOptions";
import WebConnectionOptions from "./WebConnectionOptions";
import WebSocketConnectionOptions from "./WebSocketConnectionOptions";

export default class ConnectionOptionsManager {
  private readonly connections: Map<string, ConnectionOptions> = new Map();
  constructor(hostSettings: HostSetting, context: IContext) {
    Object.getOwnPropertyNames(hostSettings)
      .map((x) => {
        var parts = x.split(".", 3);
        return {
          type: parts[0]?.trim().toLowerCase(),
          provider: parts[1]?.trim().toLowerCase(),
          name: parts[2],
          value: hostSettings[x],
        };
      })
      .filter((x) => x.type.isEqual("connection"))
      .forEach((x) => {
        var obj: ConnectionOptions;
        switch (x.provider) {
          case "web": {
            obj = new WebConnectionOptions(x.name, x.value);
            break;
          }
          case "websocket": {
            obj = new WebSocketConnectionOptions(x.name, x.value);
            break;
          }
          case "local": {
            obj = new LocalStorageConnectionOptions(x.name, x.value, context);
            break;
          }
        }
        this.connections.set(obj.Name, obj);
      });
  }

  GetConnection(connectionName: string): ConnectionOptions {
    var retVal = this.connections.get(connectionName);
    if (retVal === undefined) {
      throw new ConfigNotFoundException("host.settings", connectionName);
    }
    return retVal;
  }
}
