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
  private oldConnectionName: string;
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
    this.oldConnectionName = null;
    if (this.members.length > 0) {
      await this.loadDataAsync();
    }
  }

  private async processLoadedDataSet(dataList: Array<Data>) {
    const memberObjList = this.members.map((memberElement) =>
      this.convertToMemberObject(memberElement)
    );
    if (memberObjList.length != dataList.length) {
      throw new Error(
        `Command '${await this.id}' has ${memberObjList.length} member(s) but ${
          dataList.length
        } result(s) returned from source!`
      );
    }
    memberObjList.forEach(async (member, index) => {
      const source = dataList[index];
      await member.addDataSourceAsync(source.rows, this.id, source.options);
    });
  }

  private async loadDataAsync(): Promise<void> {
    const connectionName = await this.getAttributeValueAsync("source");
    if (this.oldConnectionName) {
      if (this.oldConnectionName !== connectionName) {
        throw new ClientException(
          `Source Attribute Can't Change in Existing Context. Valid Connection Is '${this.oldConnectionName}'`
        );
      }
    } else {
      this.oldConnectionName = connectionName;
    }

    const command = this.node.outerHTML.ToStringToken(this.context);
    const params: any = {
      command: await command.getValueAsync(),
      dmnid: this.context.options.getDefault("dmnid"),
    };
    const promiseObj = this.context.loadDataAsync(
      this.id,
      connectionName,
      params,
      this.processLoadedDataSet.bind(this)
    );
    if (!(promiseObj instanceof StreamPromise)) {
      await promiseObj;
    }
  }
}
