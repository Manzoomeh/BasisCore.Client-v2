import layout from "./assets/layout.html";
import itemLayout from "./assets/item-layout.html";
import Question from "../../../question/Question";
import { IPartCollection } from "../../../IAnswerSchema";
import { IQuestionPart } from "../../../IQuestionSchema";
import SelectListType, { type } from "../SelectListType";

export default class RadioListType extends SelectListType {
  protected get controlType(): type {
    return "radio"
  }
  protected get itemLayout(): string {
    return itemLayout
  }

  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
  }
}
