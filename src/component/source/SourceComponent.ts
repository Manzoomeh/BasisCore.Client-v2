import IContext from "../../context/IContext";
import DataSet from "../../data/DataSet";
import IData from "../../data/IData";
import ClientException from "../../exception/ClientException";
import { SourceId } from "../../type-alias";
import { NonSourceBaseComponent } from "../NonSourceBaseComponent";
import Member from "./base/Member";

export default abstract class SourceComponent<
  T extends Member
> extends NonSourceBaseComponent {
  private readonly initializeTask: Promise<void>;
  private oldConnectionName: string;
  protected id: SourceId;
  readonly range: Range;
  readonly content: DocumentFragment;
  readonly members: Array<Element>;

  abstract convertToMemberObject(element: Element): T;

  constructor(element: Element, context: IContext) {
    super(element, context);
    this.range = new Range();
    this.range.selectNode(element);
    this.content = this.range.extractContents();
    this.initializeTask = this.setName();
    this.members = [...this.content.querySelectorAll("member")];
  }

  private async setName(): Promise<void> {
    this.id = await this.getAttributeValueAsync("name");
  }

  initializeAsync(): Promise<void> {
    return this.initializeTask;
  }

  protected async runAsync(): Promise<void> {
    this.oldConnectionName = null;
    if (this.members.length > 0) {
      const dataSet = await this.loadDataAsync();
      this.processLoadedDataSet(dataSet.collection);
    }
  }

  private async processLoadedDataSet(data: IData[]) {
    const memberObjList = this.members.map((memberElement) =>
      this.convertToMemberObject(memberElement)
    );
    if (memberObjList.length != data.length) {
      throw new Error(
        `Command '${await this.id}' has ${memberObjList.length} member(s) but ${
          data.length
        } result(s) returned from source!`
      );
    }
    memberObjList.forEach(async (member, index) => {
      const source = data[index];
      await member.addDataSourceAsync(source, this.id);
    });
  }

  private async loadDataAsync(): Promise<DataSet> {
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
    const command = this.content.textContent.ToStringToken(this.context);
    const params: any = {
      command: await command.getValueAsync(),
      dmnid: this.context.options.getDefault("dmnid"),
    };
    return await this.context.loadDataAsync(this.id, connectionName, params);
  }
}
