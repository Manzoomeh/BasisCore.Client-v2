export default interface ITemplate {
  getValueAsync(data: any): Promise<string>;
}
