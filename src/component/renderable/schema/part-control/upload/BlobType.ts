import IFileInfo from "./IFileInfo";
import IFileValue from "./IFileValue";
import IBlobValue from "./IBlobValue";
import UploadType from "./UploadType";

export default class BlobType extends UploadType {
  protected CreateFileValueAsync(file: IFileInfo): Promise<IFileValue> {
    return Promise.resolve(<IBlobValue>{
      content: file.data,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadToken: this.part.uploadToken,
    });
  }
}
