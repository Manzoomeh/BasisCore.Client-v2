export default interface IDatabase {
  executeAsync<T>(sql: string, params?: any): Promise<T>;
  executeAsTableAsync(sql: string, params?: any): Promise<any[]>;
  dropAsync(): Promise<boolean>;
}
