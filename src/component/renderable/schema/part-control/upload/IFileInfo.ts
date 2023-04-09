export default interface IFileInfo {
  id?: any;
  name: string;
  image?: string | ArrayBuffer;
  type: string;
  url?: string;
  size: number;
  data?: File;
  mustDelete: boolean;
}
