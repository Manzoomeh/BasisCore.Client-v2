import IFileInfo from "./IFileInfo";
import IFileValue from "./IFileValue";
import IBlobValue from "./IBlobValue";
import UploadType from "./UploadType";
import { IQuestionPart } from "../../IQuestionSchema";
import Question from "../../question/Question";
import { IPartCollection } from "../../IAnswerSchema";

export default class BlobType extends UploadType {
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, owner, answer);
  }

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
