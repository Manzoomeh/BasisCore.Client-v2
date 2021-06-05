import IDatabase from "./IDatabase";

declare var alasql: any;

export default class LocalDataBase implements IDatabase {
  private readonly _dataBaseName: string;
  private _db;
  private readonly _getSchemas: () => Map<string, any>;
  constructor(databaseName: any, getSchemas: () => Map<string, any>) {
    this._getSchemas = getSchemas;
    this._dataBaseName = databaseName;
  }
  async dropAsync(): Promise<boolean> {
    var affected = await this.executeAsync(
      `DROP localStorage DATABASE ${this._dataBaseName}`
    );
    this._db = null;
    return affected == 1;
  }
  async executeAsync<T>(sql: string, params?: any): Promise<T> {
    if (!this._db) {
      await this.InitializeAsync();
    }
    return await new Promise<T>((resolve) =>
      this._db.exec(sql, params, (x) => resolve(x))
    );
  }
  async executeAsTableAsync(sql: string, params?: any): Promise<any[]> {
    var data = await this.executeAsync<any[]>(sql, params);
    var cols: string[];
    if (data.length > 0) {
      cols = Object.getOwnPropertyNames(data[0]);
    } else {
      cols = [];
    }
    var rows = [];
    data.forEach((row) => rows.push(cols.map((col) => row[col])));
    var retVal = [cols, ...rows];
    return retVal;
  }
  private async InitializeAsync(): Promise<void> {
    if (!this._db) {
      var lib = alasql; //await $bc.GetOrLoadDbLibAsync();
      var create = lib.exec(
        `CREATE localStorage DATABASE IF NOT EXISTS ${this._dataBaseName}`
      );
      lib.exec(`ATTACH localStorage DATABASE ${this._dataBaseName}`);
      this._db = lib.databases[this._dataBaseName];
      if (create == 1) {
        for (let [tblName, schema] of this._getSchemas().entries()) {
          var tmp = Object.getOwnPropertyNames(schema).map(
            (columnName) => `${columnName} ${schema[columnName]}`
          );
          var cols = tmp.join(",");
          console.log(`CREATE TABLE IF NOT EXISTS ${tblName} (${cols})`);
          await this.executeAsync(
            `CREATE TABLE IF NOT EXISTS ${tblName} (${cols})`
          );
        }
      }
    }
  }
}
