import { IPartCollection } from "../IAnswerSchema";
import { IQuestionPart } from "../IQuestionSchema";
import Question from "../question/Question";
import "./assets/style";
import QuestionPart from "./QuestionPart";

export default abstract class EditableQuestionPart extends QuestionPart {
  constructor(
    part: IQuestionPart,
    partLayout: string,
    owner: Question,
    answer: IPartCollection
  ) {
    super(part, partLayout, owner, answer);
  }
}
