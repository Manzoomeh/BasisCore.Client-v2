import { IPartCollection } from "../../../IAnswerSchema";
import { IQuestionPart } from "../../../IQuestionSchema";
import Question from "../../../question/Question";
import AutoFillMultiType from "../AutoFillMultiType";

export default class AutoCompleteMultiType extends AutoFillMultiType {
  constructor(
    part: IQuestionPart,
    owner: Question,
    answer: IPartCollection,
    localAnswer: IPartCollection
  ) {
    super(part, owner, answer, localAnswer);
  }
}
