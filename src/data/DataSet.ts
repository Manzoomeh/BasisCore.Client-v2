import Data from "./Data";
import IData from "./IData";

export default class DataSet {
  constructor(dataList: Data[]) {
    this.collection = dataList || [];
  }
  readonly collection: Data[];
}
