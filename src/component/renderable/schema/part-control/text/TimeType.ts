import layout from "./assets/time-layout.html";
import Question from "../../question/Question";
import TextBaseType from "../text-area/TextBaseType";
import { IPartCollection } from "../../IAnswerSchema";
import { IQuestionPart } from "../../IQuestionSchema";

export default class TimeType extends TextBaseType<HTMLInputElement> {
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }
}
