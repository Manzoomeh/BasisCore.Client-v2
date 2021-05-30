import IContext from "../../../context/IContext";
import Data from "../../../data/Data";
import IBasisCore from "../../../IBasisCore";
import InMemoryMember from "./InMemoryMember";

declare var $bc: IBasisCore;

export default class SqlMember extends InMemoryMember {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  async ParseDataAsync(): Promise<Data> {
    var rawContent = this.element.textContent.ToStringToken(this.context);
    var sql = await rawContent.getValueAsync(); //Util.GetValueOrDefaultAsync(rawContent, context.Context);

    var rawDataMemberNames = this.element.GetStringToken(
      "datamembername",
      this.context
    );
    var sources = new Array<string>();
    if (rawDataMemberNames) {
      console.log("rawDataMemberNames", rawDataMemberNames);
      sources = (await rawDataMemberNames.getValueAsync()) // Util.GetValueOrDefaultAsync(rawDataMemberNames, context.Context)
        .split(",");
    } else {
      sources = this.GetSqlSources(sql);
    }
    var task = sources.map((source) =>
      this.context.waitToGetSourceAsync(source)
    );
    var dataList = await Promise.all(task);
    var lib = await this.context.getOrLoadDbLibAsync();
    var db = new lib.Database();
    dataList.forEach((data) => {
      db.exec(`CREATE TABLE [${data.data.id}]`);
      db.tables[data.data.id].data = data.data.rows;
    });
    var queryResult = db.exec(sql);
    return new Data("", queryResult);
  }

  GetSqlSources(sql: string): string[] {
    var regexp = RegExp(/\[([^\]]+)\]/g, "g");
    var matches = (<any>sql).matchAll(regexp);
    return Array.from(matches, (m) => m[1]).filter(
      (value, index, array) => array.indexOf(value) === index
    );
  }
}
