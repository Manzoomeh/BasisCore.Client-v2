import IFileValue from "./IFileValue";

export default interface IBlobValue extends IFileValue {
  uploadToken: string;
}
