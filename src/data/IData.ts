export default interface IData {
  Name: string;
  Columns: Array<string>;
  Rows: Array<any>;
  UpdateColumnList();
}
