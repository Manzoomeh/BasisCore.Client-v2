import IContext from "../../../context/IContext";
import InMemoryMember from "./InMemoryMember";

export default class SqlMember extends InMemoryMember {
  constructor(element: Element, context: IContext) {
    super(element, context);
  }

  async ParseDataAsync(): Promise<Array<any>> {
    var rawContent = this.element.textContent.ToStringToken(this.context);
    var sql = await rawContent.getValueAsync();

    var rawDataMemberNames = this.element.GetStringToken(
      "datamembername",
      this.context
    );
    var sources = new Array<string>();
    if (rawDataMemberNames) {
      sources = (await rawDataMemberNames.getValueAsync()).split(",");
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
      db.exec(`CREATE TABLE [${data.id}]`);
      db.tables[data.id].data = data.rows;
    });
    var queryResult = db.exec(sql);
    return queryResult;
  }

  GetSqlSources(sql: string): string[] {
    var regexp = RegExp(/\[([^\]]+)\]/g, "g");
    var matches = (<any>sql).matchAll(regexp);
    return Array.from(matches, (m) => m[1]).filter(
      (value, index, array) => array.indexOf(value) === index
    );
  }
}
