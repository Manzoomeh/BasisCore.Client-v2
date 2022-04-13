import layout from "./assets/layout.html";
import "./assets/style";
import Question from "../../question/Question";
import ReadonlyQuestionPart from "../../question-part/ReadonlyQuestionPart";
import { IPartCollection } from "../../IAnswerSchema";
import { IQuestionPart } from "../../IQuestionSchema";

export default class UnknownType extends ReadonlyQuestionPart {
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout.replace("@type", part.viewType), owner, answer);
  }
}
