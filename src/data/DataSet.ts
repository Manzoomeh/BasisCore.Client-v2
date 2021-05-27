import IData from "./IData";

export default class DataSet {
  constructor(dataList: IData[]) {
    this.collection = dataList || [];
  }
  readonly collection: IData[];
}
