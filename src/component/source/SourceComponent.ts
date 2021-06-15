import IContext from "../../context/IContext";
import Data from "../../data/Data";
import { Priority } from "../../enum";
import ClientException from "../../exception/ClientException";
import { SourceId } from "../../type-alias";
import CommandComponent from "../CommandComponent";
import Member from "./base/Member";

export default abstract class SourceComponent<
  T extends Member
> extends CommandComponent {
  private oldConnectionName: string;
  protected id: SourceId;
  readonly range: Range;
  readonly content: DocumentFragment;
  readonly members: Array<Element>;
  readonly priority: Priority = Priority.high;
  abstract convertToMemberObject(element: Element): T;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.range = new Range();
    this.range.selectNode(element);
    this.content = this.range.extractContents();
    this.members = [...this.content.querySelectorAll("member")];
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
      await member.addDataSourceAsync(source.rows, this.id, source.mergeType);
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

    const command = (
      this.content.firstChild as Element
    ).outerHTML.ToStringToken(this.context);
    const params: any = {
      command: await command.getValueAsync(),
      dmnid: this.context.options.getDefault("dmnid"),
    };
    this._busy = false;
    await this.context.loadDataAsync(
      this.id,
      connectionName,
      params,
      this.processLoadedDataSet.bind(this)
    );
  }
}
