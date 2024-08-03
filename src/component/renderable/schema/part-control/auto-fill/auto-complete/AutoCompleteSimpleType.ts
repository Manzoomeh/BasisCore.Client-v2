import { IPartCollection } from "../../../IAnswerSchema";
import { IQuestionPart } from "../../../IQuestionSchema";
import Question from "../../../question/Question";
import AutoFillSimpleType from "../AutoFillSimpleType";

export default class AutoCompleteSimpleType extends AutoFillSimpleType {
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, owner, answer);
  }
}
