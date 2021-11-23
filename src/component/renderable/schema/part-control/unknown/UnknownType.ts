import layout from "./assets/layout.html";
import Question from "../../question/Question";
import { IQuestionPart, IPartCollection } from "../../ISchema";
import ReadonlyQuestionPart from "../../question-part/ReadonlyQuestionPart";

export default class UnknownType extends ReadonlyQuestionPart {
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }
}
