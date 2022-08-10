export default interface IFileInfo {
  id?: any;
  title: string;
  image?: string | ArrayBuffer;
  type: string;
  url?: string;
  size: number;
  data?: File;
  mustDelete: boolean;
}
