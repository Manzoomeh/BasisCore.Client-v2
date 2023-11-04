import IContext from "../../context/IContext";
import Data from "../../data/Data";
import ClientException from "../../exception/ClientException";
import StreamPromise from "../../options/connection-options/StreamPromise";
import { SourceId } from "../../type-alias";
import Member from "./base/Member";
import SourceComponent from "./SourceComponent";

export default abstract class MemberBaseSourceComponent<
  T extends Member
> extends SourceComponent {
  protected id: SourceId;
  private connection: StreamPromise<void>;
  readonly members: Array<Element>;
  abstract convertToMemberObject(element: Element): T;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.allowMultiProcess = true;
    this.members = [...this.node.querySelectorAll("member")];
  }

  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    this.id = await this.getAttributeValueAsync("name");
  }

  protected async runAsync(): Promise<void> {
    if (this.members.length > 0) {
      await this.loadDataAsync();
    }
  }

  private processLoadedDataSet(dataList: Array<Data>): boolean {
    if (!this.disposed) {
      const memberObjList = this.members.map((memberElement) =>
        this.convertToMemberObject(memberElement)
      );
      if (memberObjList.length != dataList.length) {
        throw new Error(
          `Command '${this.id}' has ${memberObjList.length} member(s) but ${dataList.length} result(s) returned from source!`
        );
      }
      memberObjList.forEach(async (member, index) => {
        const source = dataList[index];
        await member.addDataSourceAsync(source.rows, this.id, source.options);
      });
    }
    return !this.disposed;
  }

  private async loadDataAsync(): Promise<void> {
    const connectionName = await this.getAttributeValueAsync("source");
    const command = this.node.outerHTML.ToStringToken(this.context);
    const params: any = {
      command: await command.getValueAsync(),
      dmnid: this.context.options.getDefault("dmnid"),
    };
    if (this.connection?.isOpen ?? false) {
      if (this.connection.connectionName !== connectionName) {
        throw new ClientException(
          `Source attribute can't change when socket is open . Valid connection is '${this.connection.connectionName}'`
        );
      }
      this.connection.send(params);
    } else {
      const promiseObj = this.context.loadDataAsync(
        this.id,
        connectionName,
        params,
        this.processLoadedDataSet.bind(this)
      );
      if (promiseObj instanceof StreamPromise) {
        this.connection = promiseObj;
      } else {
        await promiseObj;
      }
    }
  }
}
