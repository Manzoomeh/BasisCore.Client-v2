import { ConnectionSetting, HttpMethod } from "../../type-alias";
import ConnectionOptions from "./ConnectionOptions";

export default abstract class UrlBaseConnectionOptions extends ConnectionOptions {
  readonly Url: string;
  readonly Verb: HttpMethod;
  readonly Heartbeat: string;
  readonly HeartbeatVerb: HttpMethod;

  constructor(name: string, setting: ConnectionSetting) {
    super(name);
    if (typeof setting === "string") {
      this.Url = setting;
    } else {
      this.Url = setting.url;
      this.Heartbeat = setting.heartbeat;
      this.Verb = setting.verb;
      this.HeartbeatVerb = setting.heartbeatverb;
    }
  }
}
