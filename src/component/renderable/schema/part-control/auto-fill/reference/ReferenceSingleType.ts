import Question from "../../../question/Question";
import AutoFillSingleType from "./../AutoFillSingleType";
import { IPartCollection } from "../../../IAnswerSchema";
import { IQuestionPart } from "../../../IQuestionSchema";

export default class ReferenceSingleType extends AutoFillSingleType {
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, owner, answer);
  }
}
