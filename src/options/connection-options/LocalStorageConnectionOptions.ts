import IBasisCore from "../../IBasisCore";
import IContext from "../../context/IContext";
import ClientException from "../../exception/ClientException";
import IDictionary from "../../IDictionary";
import ConnectionOptions from "./ConnectionOptions";

declare let $bc: IBasisCore;

export default class LocalStorageConnectionOptions extends ConnectionOptions {
  readonly Url: string;
  readonly FunctionName: string;
  private Function: (
    parameters: IDictionary<string>
  ) => Promise<IDictionary<any[]>>;
  constructor(name: string, setting: any) {
    super(name);
    if (typeof setting === "string") {
      var parts = setting.split("|");
      this.Url = parts[0];
      if (parts.length != 2) {
        throw new ClientException(
          `For Local Storage Connection '${name}', Setting In Not Valid`
        );
      }
      this.FunctionName = parts[1];
    } else {
      this.Url = setting.Url;
      this.FunctionName = setting.Function;
    }
    this.Function = null;
  }
  private async LoadLibAsync() {
    if (!this.Function) {
      this.Function = await $bc.getOrLoadObjectAsync(
        this.FunctionName,
        this.Url
      );
    }
  }
  async TestConnectionAsync(context: IContext): Promise<boolean> {
    await this.LoadLibAsync();
    return this.FunctionName !== null;
  }
  // async LoadDataAsync(
  //   context: IContext,
  //   sourceName: string,
  //   parameters: IDictionary<string>
  // ): Promise<IDataSet> {
  //   await this.LoadLibAsync();
  //   var tmp = await this.Function(parameters);
  //   var data = this.ConvertObject(tmp);
  //   return new ConstantDataSet(
  //     data.Tables.map((x) => new ConstantData(x.Key, x.Value))
  //   );
  // }
  LoadPageAsync(
    context: IContext,
    pageName: string,
    parameters: IDictionary<string>
  ): Promise<string> {
    throw new ClientException(
      "LoadPageAsync Method not Supported In LocalStorage Provider."
    );
  }
}
