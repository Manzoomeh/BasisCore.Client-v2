import { IQuestionPart, IPartCollection } from "../../ISchema";
import Question from "../../question/Question";
import layout from "./assets/layout.html";
import TextBaseType from "./TextBaseType";

export default class TextAriaType extends TextBaseType<HTMLTextAreaElement> {
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    if (answer) {
      this.input.value = answer.values[0].value;
    }
  }
}
