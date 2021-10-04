export default interface ITemplate<TResult> {
  getValueAsync(data: any): Promise<TResult>;
}
