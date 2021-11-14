import layout from "./assets/layout.html";
import Question from "../../question/Question";
import TextBaseType from "../text-area/TextBaseType";
import { IQuestionPart, IPartCollection } from "../../ISchema";

export default class TextType extends TextBaseType<HTMLInputElement> {
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }
}
